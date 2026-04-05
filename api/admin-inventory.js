import { allowCors, readJsonBody, sendJson } from './_lib/http.js';
import { requireAdmin } from './_lib/auth.js';
import { getServiceClient } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  try {
    await requireAdmin(req);
    const supabase = getServiceClient();

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('inventory_flags').select('*').order('label');
      if (error) throw error;
      return sendJson(res, 200, { inventoryFlags: data || [] });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const { data, error } = await supabase
        .from('inventory_flags')
        .update({ is_available: Boolean(body.isAvailable), updated_at: new Date().toISOString() })
        .eq('ingredient_code', body.ingredientCode)
        .select('*')
        .single();
      if (error) throw error;
      return sendJson(res, 200, { inventoryFlag: data });
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'Inventory request failed' });
  }
}
