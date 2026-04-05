import { getAnonClient, getServiceClient } from './supabase.js';

export async function requireUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    const error = new Error('Missing bearer token');
    error.status = 401;
    throw error;
  }

  const anon = getAnonClient();
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) {
    const err = new Error('Invalid or expired session');
    err.status = 401;
    throw err;
  }

  const service = getServiceClient();
  const { data: profileData, error: profileError } = await service
    .from('profiles')
    .select('*')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (profileError) {
    const err = new Error(profileError.message);
    err.status = 500;
    throw err;
  }

  return { user: data.user, profile: profileData };
}

export async function requireAdmin(req) {
  const auth = await requireUser(req);
  if (auth.profile?.role !== 'admin') {
    const error = new Error('Admin access required');
    error.status = 403;
    throw error;
  }
  return auth;
}
