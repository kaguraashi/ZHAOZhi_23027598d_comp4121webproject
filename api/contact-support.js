export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(501).json({
    error: 'Support form is opening soon.',
    message: 'Support requests will open here soon. Please use the contact details shown in Settings for now.',
  });
}
