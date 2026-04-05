import { allowCors, sendJson } from './_lib/http.js';
import { getServiceClient } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    const supabase = getServiceClient();
    const [{ data: menuItems, error: menuError }, { data: inventory, error: inventoryError }] = await Promise.all([
      supabase.from('menu_items').select('*').eq('active', true).order('category').order('name'),
      supabase.from('inventory_flags').select('*').order('label'),
    ]);

    if (menuError) throw menuError;
    if (inventoryError) throw inventoryError;

    return sendJson(res, 200, { menuItems, inventoryFlags: inventory });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Failed to load menu' });
  }
}
