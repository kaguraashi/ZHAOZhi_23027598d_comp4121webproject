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

function isMissingPresetTable(error) {
  const message = String(error?.message || '');
  return message.includes('custom_meal_presets') && (message.includes('does not exist') || message.includes('relation'));
}

function summarizeCustomization(customization) {
  const single = Object.values(customization?.singleChoice || {}).join(' ');
  const multi = Object.values(customization?.multiChoice || {}).flat().join(' ');
  const notes = String(customization?.notes || '').trim();
  return `${single} ${multi} ${notes}`.trim();
}

function buildMenuDigest(menuItems) {
  return (menuItems || []).slice(0, 18).map((item) => ({
    name: item.name,
    category: item.category,
    price_hkd: normalizeHkd(item.base_price),
    description: item.description,
    slug: item.slug,
  }));
}

function buildPresetDigest(presets) {
  return (presets || []).slice(0, 12).map((preset) => ({
    id: String(preset.id),
    title: preset.title,
    goal_tag: preset.goal_tag || '',
    estimated_price_hkd: normalizeHkd(preset.estimated_price),
    menu_item_slug: preset.menu_item_slug || 'build-your-own-bowl',
    customization_summary: summarizeCustomization(preset.customization),
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

async function getCommunityPresets() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('custom_meal_presets')
      .select('id, title, goal_tag, estimated_price, menu_item_slug, customization')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      if (isMissingPresetTable(error)) return [];
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
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

function scorePreset(preset, prompt) {
  const text = `${preset.title || ''} ${preset.goal_tag || ''} ${summarizeCustomization(preset.customization)}`.toLowerCase();
  const q = prompt.toLowerCase();
  let score = 0;

  if (/community|saved|preset|custom|builder|bowl/.test(q)) score += 2;
  if (/protein|gym|post-workout|high protein/.test(q) && /protein|chicken|beef|salmon|tofu/.test(text)) score += 4;
  if (/light|lighter|low calorie|healthy|diet/.test(q) && /light|broccoli|vegetable|tofu/.test(text)) score += 4;
  if (/spicy/.test(q) && /spicy|pepper|satay/.test(text)) score += 2;
  if (/no mushroom|without mushroom/.test(q) && /mushroom/.test(text)) score -= 10;

  const budgetMatch = q.match(/(?:hk\$|\$)?\s*(\d{2,3})/i);
  if (budgetMatch) {
    const budget = Number(budgetMatch[1]);
    const price = normalizeHkd(preset.estimated_price);
    if (price > 0) {
      if (price <= budget) score += 3;
      else score -= 4;
    }
  }

  return score;
}

function buildCommunityResult(preset) {
  const price = normalizeHkd(preset?.estimated_price);
  return {
    recommendationType: 'community_preset',
    recommendedDish: preset?.title || 'Community bowl',
    recommendedPresetId: preset?.id ? String(preset.id) : '',
    menuItemSlug: preset?.menu_item_slug || 'build-your-own-bowl',
    presetCustomization: preset?.customization || {},
    summary: 'A saved community bowl matches your request well.',
    reason: preset?.goal_tag || summarizeCustomization(preset?.customization) || 'This saved bowl looks close to your goal.',
    kitchenNote: price ? `Estimated price: HK$${price}` : 'You can still fine-tune it in the builder.',
    budgetTip: 'Open it in the builder if you want to adjust the ingredients.',
  };
}

function buildMenuResult(choice) {
  const price = normalizeHkd(choice?.base_price);
  return {
    recommendationType: 'regular_menu',
    recommendedDish: choice?.name || 'Build Your Own Bowl',
    recommendedPresetId: '',
    menuItemSlug: choice?.slug || '',
    presetCustomization: null,
    summary: 'Here is a quick meal idea based on your request.',
    reason: choice?.description || 'This looks like the closest match for your goal and budget.',
    kitchenNote: price ? `Estimated price: HK$${price}` : 'You can still adjust the meal before checkout.',
    budgetTip: 'You can fine-tune ingredients after opening the builder.',
  };
}

function localFallback(prompt, menuItems, communityPresets) {
  const rankedMenus = [...(menuItems || [])].sort((a, b) => scoreDish(b, prompt) - scoreDish(a, prompt));
  const rankedPresets = [...(communityPresets || [])].sort((a, b) => scorePreset(b, prompt) - scorePreset(a, prompt));

  const bestMenu = rankedMenus[0] || menuItems[0] || { name: 'Build Your Own Bowl', base_price: 48, category: 'custom', slug: 'build-your-own-bowl' };
  const bestPreset = rankedPresets[0] || null;
  const menuScore = scoreDish(bestMenu, prompt);
  const presetScore = bestPreset ? scorePreset(bestPreset, prompt) : Number.NEGATIVE_INFINITY;

  if (bestPreset && presetScore >= menuScore) {
    return buildCommunityResult(bestPreset);
  }

  return buildMenuResult(bestMenu);
}

function normalizeModelResult(result, communityPresets, menuItems) {
  const normalized = {
    recommendationType: result?.recommendationType === 'community_preset' ? 'community_preset' : 'regular_menu',
    recommendedDish: String(result?.recommendedDish || '').trim(),
    recommendedPresetId: String(result?.recommendedPresetId || '').trim(),
    menuItemSlug: String(result?.menuItemSlug || '').trim(),
    summary: String(result?.summary || '').trim(),
    reason: String(result?.reason || '').trim(),
    kitchenNote: String(result?.kitchenNote || '').trim(),
    budgetTip: String(result?.budgetTip || '').trim(),
  };

  if (normalized.recommendationType === 'community_preset') {
    const preset = communityPresets.find((entry) => String(entry.id) === normalized.recommendedPresetId)
      || communityPresets.find((entry) => entry.title === normalized.recommendedDish);
    if (preset) {
      return {
        ...normalized,
        recommendedDish: normalized.recommendedDish || preset.title,
        recommendedPresetId: String(preset.id),
        menuItemSlug: normalized.menuItemSlug || preset.menu_item_slug || 'build-your-own-bowl',
        presetCustomization: preset.customization || {},
      };
    }
  }

  const matchedMenu = menuItems.find((entry) => entry.slug === normalized.menuItemSlug)
    || menuItems.find((entry) => entry.name === normalized.recommendedDish);

  return {
    ...normalized,
    recommendedDish: normalized.recommendedDish || matchedMenu?.name || 'Suggested dish',
    menuItemSlug: normalized.menuItemSlug || matchedMenu?.slug || '',
    presetCustomization: null,
  };
}

async function queryGithubModels(githubToken, prompt, menuItems, communityPresets) {
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
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content:
            'You are a concise meal planning assistant for a food ordering website. You may recommend either a regular menu dish or a public community-saved bowl preset. Return valid JSON only with keys recommendationType, recommendedDish, recommendedPresetId, menuItemSlug, summary, reason, kitchenNote, budgetTip. recommendationType must be either regular_menu or community_preset. If you choose a community preset, use the exact preset id from the provided list.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            request: prompt,
            menu: buildMenuDigest(menuItems),
            communityPresets: buildPresetDigest(communityPresets),
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
  if (parsed) return normalizeModelResult(parsed, communityPresets, menuItems);

  return {
    recommendationType: 'regular_menu',
    recommendedDish: '',
    recommendedPresetId: '',
    menuItemSlug: '',
    presetCustomization: null,
    summary: cleanModelText(content) || 'Here is a quick meal suggestion.',
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
    const [menuItems, communityPresets] = await Promise.all([
      getMenuItems(),
      getCommunityPresets(),
    ]);

    if (!githubToken) {
      return sendJson(res, 200, { result: localFallback(prompt, menuItems, communityPresets), fallback: true });
    }

    try {
      const result = await queryGithubModels(githubToken, prompt, menuItems, communityPresets);
      return sendJson(res, 200, { result, fallback: false });
    } catch {
      return sendJson(res, 200, { result: localFallback(prompt, menuItems, communityPresets), fallback: true });
    }
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message || 'AI helper failed' });
  }
}
