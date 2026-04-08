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

const AUTO_ASSIGN_ON_ACCEPT = ['accepted', 'making', 'ready'];

function isValidTransition(currentStatus, newStatus) {
  const allowed = STATUS_FLOW[currentStatus] || [];
  return allowed.includes(newStatus);
}

function canSkipToStatus(currentStatus, targetStatus) {
  const flow = STATUS_FLOW[currentStatus] || [];
  if (flow.includes(targetStatus)) return true;

  const currentIndex = VALID_STATUSES.indexOf(currentStatus);
  const targetIndex = VALID_STATUSES.indexOf(targetStatus);

  if (currentIndex < 0 || targetIndex < 0) return false;

  if (targetStatus === 'cancelled') return true;

  return false;
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

    const { orderId, status, reason, metadata } = body;

    if (!orderId) {
      return sendJson(res, 400, { error: 'Missing orderId' });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return sendJson(res, 400, { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingOrder) {
      return sendJson(res, 404, { error: 'Order not found' });
    }

    if (!isValidTransition(existingOrder.status, status)) {
      return sendJson(res, 400, {
        error: `Invalid status transition from '${existingOrder.status}' to '${status}'`,
        allowedTransitions: STATUS_FLOW[existingOrder.status] || [],
      });
    }

    let merchantId = auth.profile?.merchant_id;
    if (AUTO_ASSIGN_ON_ACCEPT.includes(status) && !existingOrder.merchant_id) {
      if (!merchantId && auth.profile?.role !== 'admin') {
        return sendJson(res, 400, { error: 'Cannot accept order without merchant assignment' });
      }
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status,
        ...(merchantId && !existingOrder.merchant_id ? { merchant_id: merchantId } : {}),
      })
      .eq('id', orderId)
      .select('*, order_items(*), merchants(name)')
      .single();

    if (updateError) throw updateError;

    const historyEntry = {
      order_id: orderId,
      previous_status: existingOrder.status,
      new_status: status,
      changed_by: auth.user.id,
      changed_by_role: auth.profile?.role,
      reason: reason || null,
      metadata: metadata || {},
    };

    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert(historyEntry);

    if (historyError) {
      console.error('Failed to record status history:', historyError);
    }

    const { data: history } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    return sendJson(res, 200, {
      order: normalizeOrder(updatedOrder),
      statusHistory: history || [],
    });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'Failed to update order status' });
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

export { STATUS_FLOW, isValidTransition, canSkipToStatus };