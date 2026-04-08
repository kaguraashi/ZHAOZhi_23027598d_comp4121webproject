import { allowCors, readJsonBody, sendJson } from '../lib/server/http.js';
import { requireMerchant } from '../lib/server/auth.js';
import { getServiceClient } from '../lib/server/supabase.js';

const VALID_STATUSES = ['pending_receipt', 'accepted', 'making', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];

const STATUS_FLOW = {
  pending_receipt: ['accepted', 'cancelled'],
  accepted: ['making', 'cancelled'],
  making: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const BATCH_MAX_SIZE = 50;

function isValidTransition(currentStatus, newStatus) {
  const allowed = STATUS_FLOW[currentStatus] || [];
  return allowed.includes(newStatus);
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const auth = await requireMerchant(req);
    const supabase = getServiceClient();
    const body = await readJsonBody(req);

    const { orderIds, status, action, reason } = body;

    if (action === 'batch_update') {
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return sendJson(res, 400, { error: 'orderIds must be a non-empty array' });
      }

      if (orderIds.length > BATCH_MAX_SIZE) {
        return sendJson(res, 400, { error: `Batch size exceeds maximum of ${BATCH_MAX_SIZE}` });
      }

      if (!status || !VALID_STATUSES.includes(status)) {
        return sendJson(res, 400, { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      }

      const { data: existingOrders, error: fetchError } = await supabase
        .from('orders')
        .select('id, status, merchant_id')
        .in('id', orderIds);

      if (fetchError) throw fetchError;

      if (existingOrders.length !== orderIds.length) {
        const foundIds = new Set(existingOrders.map(o => o.id));
        const missingIds = orderIds.filter(id => !foundIds.has(id));
        return sendJson(res, 404, { error: 'Some orders not found', missingIds });
      }

      const invalidTransitions = [];
      const validOrderIds = [];

      for (const order of existingOrders) {
        if (!isValidTransition(order.status, status)) {
          invalidTransitions.push({
            orderId: order.id,
            currentStatus: order.status,
            targetStatus: status,
          });
        } else {
          validOrderIds.push(order.id);
        }
      }

      if (validOrderIds.length === 0) {
        return sendJson(res, 400, {
          error: 'No valid status transitions',
          invalidTransitions,
        });
      }

      const { data: updatedOrders, error: updateError } = await supabase
        .from('orders')
        .update({ status })
        .in('id', validOrderIds)
        .select('*, order_items(*), merchants(name)');

      if (updateError) throw updateError;

      const historyEntries = validOrderIds.map(orderId => {
        const existingOrder = existingOrders.find(o => o.id === orderId);
        return {
          order_id: orderId,
          previous_status: existingOrder?.status,
          new_status: status,
          changed_by: auth.user.id,
          changed_by_role: auth.profile?.role,
          reason: reason || 'Batch update',
          metadata: { batch_operation: true },
        };
      });

      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert(historyEntries);

      if (historyError) {
        console.error('Failed to record batch status history:', historyError);
      }

      return sendJson(res, 200, {
        success: true,
        updatedCount: updatedOrders.length,
        updatedOrders: updatedOrders.map(normalizeOrder),
        skippedCount: invalidTransitions.length,
        skippedOrders: invalidTransitions,
      });
    }

    if (action === 'batch_cancel') {
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return sendJson(res, 400, { error: 'orderIds must be a non-empty array' });
      }

      if (orderIds.length > BATCH_MAX_SIZE) {
        return sendJson(res, 400, { error: `Batch size exceeds maximum of ${BATCH_MAX_SIZE}` });
      }

      const { data: existingOrders, error: fetchError } = await supabase
        .from('orders')
        .select('id, status, merchant_id')
        .in('id', orderIds);

      if (fetchError) throw fetchError;

      const cancelableStatuses = ['pending_receipt', 'accepted', 'making', 'ready'];
      const validForCancel = existingOrders.filter(
        o => cancelableStatuses.includes(o.status) && isValidTransition(o.status, 'cancelled')
      );
      const alreadyCancelledOrDelivered = existingOrders.filter(
        o => !cancelableStatuses.includes(o.status) || !isValidTransition(o.status, 'cancelled')
      );

      if (validForCancel.length === 0) {
        return sendJson(res, 400, {
          error: 'No orders can be cancelled',
          invalidOrders: alreadyCancelledOrDelivered,
        });
      }

      const { data: updatedOrders, error: updateError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .in('id', validForCancel.map(o => o.id))
        .select('*, order_items(*), merchants(name)');

      if (updateError) throw updateError;

      const historyEntries = validForCancel.map(orderId => {
        const existingOrder = existingOrders.find(o => o.id === orderId);
        return {
          order_id: orderId,
          previous_status: existingOrder?.status,
          new_status: 'cancelled',
          changed_by: auth.user.id,
          changed_by_role: auth.profile?.role,
          reason: reason || 'Batch cancellation',
          metadata: { batch_operation: true, cancellation: true },
        };
      });

      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert(historyEntries);

      if (historyError) {
        console.error('Failed to record batch cancel history:', historyError);
      }

      return sendJson(res, 200, {
        success: true,
        cancelledCount: updatedOrders.length,
        cancelledOrders: updatedOrders.map(normalizeOrder),
        skippedCount: alreadyCancelledOrDelivered.length,
        skippedOrders: alreadyCancelledOrDelivered,
      });
    }

    return sendJson(res, 400, { error: 'Invalid action' });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'Batch operation failed' });
  }
}

function normalizeOrder(order) {
  return {
    ...order,
    items: (order.order_items || []).map((item) => ({
      ...item,
      customization: item.customization || {},
    })),
  };
}