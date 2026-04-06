export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(501).json({
    error: 'Merchant sign in is opening soon.',
    message: 'Merchant sign in is opening soon. Please contact support if you want early access.',
  });
}
