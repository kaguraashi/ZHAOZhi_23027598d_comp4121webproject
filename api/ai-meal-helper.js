import './_lib/env.js';
import { allowCors, readJsonBody, sendJson } from './_lib/http.js';
import { getServiceClient } from './_lib/supabase.js';

function cleanModelText(text) {
  return String(text || '').replace(/^```json\s*/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(cleanModelText(text));
  } catch {
    return null;
  }
}

function buildMenuDigest(menuItems) {
  return (menuItems || []).slice(0, 18).map((item) => ({
    name: item.name,
    category: item.category,
    price_hkd: Number(item.base_price || 0) / 100,
    description: item.description,
  }));
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    const githubToken = process.env.GITHUB_MODELS_TOKEN;
    if (!githubToken) {
      return sendJson(res, 500, { error: 'GITHUB_MODELS_TOKEN is missing in the server env.' });
    }

    const body = await readJsonBody(req);
    const prompt = String(body.prompt || '').trim().slice(0, 700);
    if (!prompt) return sendJson(res, 400, { error: 'Prompt is required.' });

    const supabase = getServiceClient();
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('name, category, description, base_price')
      .eq('active', true)
      .order('category')
      .order('name');

    if (menuError) throw menuError;

    const menuDigest = buildMenuDigest(menuItems);

    const response = await fetch('https://models.github.ai/inference/chat/completions', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4.1-mini',
        temperature: 0.3,
        max_tokens: 180,
        messages: [
          {
            role: 'system',
            content:
              'You are a concise meal planning assistant for a food ordering website. Return valid JSON only with keys summary, recommendedDish, reason, kitchenNote, budgetTip. Keep every field short. Use a dish name from the provided menu when possible.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              request: prompt,
              menu: menuDigest,
            }),
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.error?.message || payload.message || 'GitHub Models request failed';
      return sendJson(res, response.status, { error: message });
    }

    const content = payload.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParse(content);

    if (parsed) {
      return sendJson(res, 200, { result: parsed });
    }

    return sendJson(res, 200, {
      result: {
        summary: cleanModelText(content),
        recommendedDish: '',
        reason: '',
        kitchenNote: '',
        budgetTip: '',
      },
    });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'AI helper failed' });
  }
}
