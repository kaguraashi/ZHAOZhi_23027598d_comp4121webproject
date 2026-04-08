import { allowCors, sendJson } from '../lib/server/http.js';
import { requireMerchant } from '../lib/server/auth.js';
import { getServiceClient } from '../lib/server/supabase.js';

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  try {
    const auth = await requireMerchant(req);
    const supabase = getServiceClient();
    const url = new URL(req.url, 'http://localhost');

    const orderId = url.searchParams.get('orderId');
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));

    if (orderId) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order) {
        return sendJson(res, 404, { error: 'Order not found' });
      }

      const { data: history, error: historyError } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (historyError) throw historyError;

      return sendJson(res, 200, {
        orderId,
        history: history || [],
      });
    }

    const merchantId = auth.profile?.merchant_id;
    const isAdmin = auth.profile?.role === 'admin';

    let query = supabase
      .from('order_status_history')
      .select('*, orders(id, customer_name, status)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!isAdmin && merchantId) {
      query = query.filter('orders.merchant_id', 'eq', merchantId);
    }

    const { data: history, error: historyError } = await query;

    if (historyError) throw historyError;

    return sendJson(res, 200, {
      history: history || [],
    });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'Failed to fetch order history' });
  }
}