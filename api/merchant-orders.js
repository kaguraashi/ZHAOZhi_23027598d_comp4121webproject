import { allowCors, readJsonBody, sendJson } from '../lib/server/http.js';
import { requireMerchant } from '../lib/server/auth.js';
import { getServiceClient } from '../lib/server/supabase.js';

const VALID_STATUSES = ['pending_receipt', 'accepted', 'making', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];
const VALID_ORDER_TYPES = ['pickup', 'dine_in', 'delivery'];
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function normalizeOrders(rows) {
  return (rows || []).map((order) => ({
    ...order,
    items: (order.order_items || []).map((item) => ({
      ...item,
      customization: item.customization || {},
    })),
  }));
}

function buildQuery(supabase, filters, merchantId, isAdmin) {
  let query = supabase
    .from('orders')
    .select('*, order_items(*), merchants(name)', { count: 'exact' });

  if (!isAdmin && merchantId) {
    query = query.eq('merchant_id', merchantId);
  }

  if (filters.status && filters.status.length > 0) {
    if (filters.status.length === 1) {
      query = query.eq('status', filters.status[0]);
    } else {
      query = query.in('status', filters.status);
    }
  }

  if (filters.orderType && filters.orderType.length > 0) {
    if (filters.orderType.length === 1) {
      query = query.eq('order_type', filters.orderType[0]);
    } else {
      query = query.in('order_type', filters.orderType);
    }
  }

  if (filters.priorityDelivery !== undefined) {
    query = query.eq('priority_delivery', filters.priorityDelivery);
  }

  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(`customer_name.ilike.${searchTerm},customer_email.ilike.${searchTerm},id.ilike.${searchTerm}`);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  return query;
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  try {
    const auth = await requireMerchant(req);
    const supabase = getServiceClient();
    const isAdmin = auth.profile?.role === 'admin';
    const merchantId = auth.profile?.merchant_id;

    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
      const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(url.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10)));
      const sortBy = url.searchParams.get('sortBy') || 'created_at';
      const sortOrder = url.searchParams.get('sortOrder') || 'desc';

      const validSortColumns = ['created_at', 'updated_at', 'total', 'status', 'order_type'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';

      const filters = {
        status: url.searchParams.getAll('status'),
        orderType: url.searchParams.getAll('orderType'),
        priorityDelivery: url.searchParams.get('priorityDelivery'),
        search: url.searchParams.get('search') || '',
        dateFrom: url.searchParams.get('dateFrom') || '',
        dateTo: url.searchParams.get('dateTo') || '',
      };

      if (filters.priorityDelivery === 'true') filters.priorityDelivery = true;
      else if (filters.priorityDelivery === 'false') filters.priorityDelivery = false;
      else filters.priorityDelivery = undefined;

      for (const status of filters.status) {
        if (!VALID_STATUSES.includes(status)) {
          return sendJson(res, 400, { error: `Invalid status: ${status}` });
        }
      }

      for (const orderType of filters.orderType) {
        if (!VALID_ORDER_TYPES.includes(orderType)) {
          return sendJson(res, 400, { error: `Invalid order type: ${orderType}` });
        }
      }

      let query = buildQuery(supabase, filters, merchantId, isAdmin);
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
      query = query.range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / pageSize);

      const statusCounts = {};
      const statusQuery = buildQuery(supabase, { ...filters, status: [] }, merchantId, isAdmin);
      const { data: allOrders } = await statusQuery.select('status');

      for (const order of (allOrders || [])) {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      }

      return sendJson(res, 200, {
        orders: normalizeOrders(data),
        pagination: {
          page,
          pageSize,
          totalItems: count || 0,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        statusCounts,
      });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const { orderId, action } = body;

      if (action === 'assign_merchant') {
        if (!isAdmin) {
          return sendJson(res, 403, { error: 'Only admin can assign merchants to orders' });
        }
        if (!orderId || !body.merchantId) {
          return sendJson(res, 400, { error: 'Missing orderId or merchantId' });
        }

        const { data, error } = await supabase
          .from('orders')
          .update({ merchant_id: body.merchantId })
          .eq('id', orderId)
          .select('*, order_items(*), merchants(name)')
          .single();

        if (error) throw error;

        await recordStatusChange(supabase, orderId, null, 'assigned', auth.user.id, auth.profile.role, 'Assigned to merchant');

        return sendJson(res, 200, { order: normalizeOrders([data])[0] });
      }

      return sendJson(res, 400, { error: 'Invalid action' });
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'Failed to process request' });
  }
}

async function recordStatusChange(supabase, orderId, previousStatus, newStatus, userId, userRole, reason, metadata = {}) {
  const { error } = await supabase
    .from('order_status_history')
    .insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: userId,
      changed_by_role: userRole,
      reason,
      metadata,
    });

  if (error) {
    console.error('Failed to record status change:', error);
  }

  return !error;
}