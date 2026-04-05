import { allowCors, readJsonBody, sendJson } from './_lib/http.js';
import { requireAdmin } from './_lib/auth.js';
import { getServiceClient } from './_lib/supabase.js';

const allowedStatuses = new Set(['received', 'cooking', 'ready', 'out_for_delivery', 'delivered', 'cancelled']);

export default async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    await requireAdmin(req);
    const body = await readJsonBody(req);
    if (!allowedStatuses.has(body.status)) return sendJson(res, 400, { error: 'Invalid status' });

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('orders')
      .update({ status: body.status })
      .eq('id', body.orderId)
      .select('*, order_items(*)')
      .single();

    if (error) throw error;
    return sendJson(res, 200, { order: data });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'Failed to update order status' });
  }
}
