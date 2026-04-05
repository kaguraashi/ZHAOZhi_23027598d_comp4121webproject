import { allowCors, sendJson } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';

export default async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    const { user, profile } = await requireUser(req);
    return sendJson(res, 200, {
      user: {
        id: user.id,
        email: user.email,
        fullName: profile?.full_name || user.user_metadata?.full_name || '',
        role: profile?.role || 'customer',
        loyaltyCoins: profile?.loyalty_coins || 0,
      },
    });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'Failed to load profile' });
  }
}
