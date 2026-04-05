import { allowCors, sendJson } from './_lib/http.js';
import { requireAdmin } from './_lib/auth.js';
import { getServiceClient } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    await requireAdmin(req);
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return sendJson(res, 200, { orders: data || [] });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'Failed to load admin queue' });
  }
}
