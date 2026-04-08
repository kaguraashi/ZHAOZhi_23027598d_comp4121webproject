import { allowCors, readJsonBody, sendJson } from '../lib/server/http.js';
import { getServiceClient } from '../lib/server/supabase.js';

export default async function handler(req, res) {
  if (allowCors(req, res)) return;

  const supabase = getServiceClient();

  if (req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { action, email, password, merchantName, merchantId } = body;

      if (action === 'register') {
        if (!merchantName || !email || !password) {
          return sendJson(res, 400, { error: 'Missing required fields' });
        }

        const { data: existingMerchant, error: checkError } = await supabase
          .from('merchants')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingMerchant) {
          return sendJson(res, 409, { error: 'Email already registered as merchant' });
        }

        const { data: newMerchant, error: merchantError } = await supabase
          .from('merchants')
          .insert({ name: merchantName, email })
          .select()
          .single();

        if (merchantError) throw merchantError;

        const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role: 'merchant', merchant_id: newMerchant.id }
        });

        if (signUpError) {
          await supabase.from('merchants').delete().eq('id', newMerchant.id);
          throw signUpError;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: 'merchant', merchant_id: newMerchant.id })
          .eq('user_id', authData.user.id);

        if (profileError) throw profileError;

        return sendJson(res, 201, {
          merchant: newMerchant,
          user: { id: authData.user.id, email: authData.user.email }
        });
      }

      if (action === 'login') {
        if (!email || !password) {
          return sendJson(res, 400, { error: 'Missing email or password' });
        }

        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          return sendJson(res, 401, { error: 'Invalid credentials' });
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*, merchants(*)')
          .eq('user_id', authData.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile || profile.role !== 'merchant') {
          await supabase.auth.signOut();
          return sendJson(res, 403, { error: 'Not a merchant account' });
        }

        if (profile.merchants && !profile.merchants.is_active) {
          await supabase.auth.signOut();
          return sendJson(res, 403, { error: 'Merchant account is deactivated' });
        }

        return sendJson(res, 200, {
          session: authData.session,
          user: {
            id: authData.user.id,
            email: authData.user.email,
            role: profile.role,
            merchantId: profile.merchant_id,
            merchant: profile.merchants
          }
        });
      }

      if (action === 'logout') {
        await supabase.auth.signOut();
        return sendJson(res, 200, { message: 'Logged out successfully' });
      }

      return sendJson(res, 400, { error: 'Invalid action' });
    } catch (error) {
      return sendJson(res, error.status || 500, { error: error.message || 'Authentication failed' });
    }
  }

  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

      if (!token) {
        return sendJson(res, 401, { error: 'Missing authentication token' });
      }

      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData.user) {
        return sendJson(res, 401, { error: 'Invalid or expired token' });
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, merchants(*)')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || profile.role !== 'merchant') {
        return sendJson(res, 403, { error: 'Not a merchant account' });
      }

      return sendJson(res, 200, {
        user: {
          id: userData.user.id,
          email: userData.user.email,
          role: profile.role,
          merchantId: profile.merchant_id,
          merchant: profile.merchants
        }
      });
    } catch (error) {
      return sendJson(res, error.status || 500, { error: error.message || 'Failed to verify token' });
    }
  }

  return sendJson(res, 405, { error: 'Method not allowed' });
}