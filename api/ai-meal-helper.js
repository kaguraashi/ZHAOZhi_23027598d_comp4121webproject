import '../lib/server/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { allowCors, readJsonBody, sendJson } from '../lib/server/http.js';
import { getServiceClient } from '../lib/server/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function cleanModelText(text) {
  return String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(cleanModelText(text));
  } catch {
    return null;
  }
}

function normalizeHkd(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return num;
}

function buildMenuDigest(menuItems) {
  return (menuItems || []).slice(0, 18).map((item) => ({
    name: item.name,
    category: item.category,
    price_hkd: normalizeHkd(item.base_price),
    description: item.description,
  }));
}

function loadCatalogFallback() {
  try {
    const file = path.join(projectRoot, 'data', 'catalog.json');
    if (!fs.existsSync(file)) return [];
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed?.menuItems) ? parsed.menuItems : [];
  } catch {
    return [];
  }
}

async function getMenuItems() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('menu_items')
      .select('name, category, description, base_price, slug')
      .eq('active', true)
      .order('category')
      .order('name');
    if (!error && Array.isArray(data) && data.length) return data;
  } catch {}
  return loadCatalogFallback();
}

function scoreDish(item, prompt) {
  const text = `${item.name || ''} ${item.category || ''} ${item.description || ''}`.toLowerCase();
  const q = prompt.toLowerCase();
  let score = 0;

  if (/protein|gym|post-workout|high protein/.test(q)) {
    if (/chicken|beef|salmon|protein/.test(text)) score += 4;
    if (/tofu/.test(text)) score += 2;
  }
  if (/light|lighter|low calorie|healthy|diet/.test(q)) {
    if (/salad|broccoli|tofu|vegetable|light/.test(text)) score += 4;
    if (/fried|pork belly/.test(text)) score -= 3;
  }
  if (/breakfast/.test(q) && /breakfast|tea|toast|egg/.test(text)) score += 4;
  if (/lunch|office/.test(q) && /rice|bowl|noodle|set/.test(text)) score += 3;
  if (/spicy/.test(q) && /spicy|satay|pepper/.test(text)) score += 2;
  if (/no mushroom|without mushroom/.test(q) && /mushroom/.test(text)) score -= 10;

  const budgetMatch = q.match(/(?:hk\$|\$)?\s*(\d{2,3})/i);
  if (budgetMatch) {
    const budget = Number(budgetMatch[1]);
    const price = normalizeHkd(item.base_price);
    if (price > 0) {
      if (price <= budget) score += 3;
      else score -= 4;
    }
  }

  return score;
}

function localFallback(prompt, menuItems) {
  const ranked = [...(menuItems || [])].sort((a, b) => scoreDish(b, prompt) - scoreDish(a, prompt));
  const choice = ranked[0] || menuItems[0] || { name: 'Build Your Own Bowl', base_price: 48, category: 'custom' };
  const price = normalizeHkd(choice.base_price);
  return {
    summary: 'Here is a quick meal idea based on your request.',
    recommendedDish: choice.name || 'Build Your Own Bowl',
    reason: choice.description || 'This looks like the closest match for your goal and budget.',
    kitchenNote: price ? `Estimated price: HK$${price}` : 'You can still adjust the meal before checkout.',
    budgetTip: 'You can fine-tune ingredients after opening the builder.',
  };
}

async function queryGithubModels(githubToken, prompt, menuItems) {
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
            menu: buildMenuDigest(menuItems),
          }),
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || payload.message || 'GitHub Models request failed';
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  const content = payload.choices?.[0]?.message?.content || '';
  const parsed = safeJsonParse(content);
  if (parsed) return parsed;

  return {
    summary: cleanModelText(content) || 'Here is a quick meal suggestion.',
    recommendedDish: '',
    reason: '',
    kitchenNote: '',
    budgetTip: '',
  };
}

export default async function handler(req, res) {
  if (allowCors(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    const body = await readJsonBody(req);
    const prompt = String(body.prompt || '').trim().slice(0, 700);
    if (!prompt) return sendJson(res, 400, { error: 'Prompt is required.' });

    const githubToken = process.env.GITHUB_MODELS_TOKEN;
    const menuItems = await getMenuItems();

    if (!githubToken) {
      return sendJson(res, 200, { result: localFallback(prompt, menuItems), fallback: true });
    }

    try {
      const result = await queryGithubModels(githubToken, prompt, menuItems);
      return sendJson(res, 200, { result, fallback: false });
    } catch {
      return sendJson(res, 200, { result: localFallback(prompt, menuItems), fallback: true });
    }
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'AI helper failed' });
  }
}
