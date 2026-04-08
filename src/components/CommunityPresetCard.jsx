import { estimateCustomizationNutrition, formatNutritionLine } from '../lib/mealMeta.js';
import { formatCurrency } from '../lib/pricing.js';

function summarizeCustomization(customization) {
  const parts = [];
  const single = customization?.singleChoice || {};
  const multi = customization?.multiChoice || {};

  for (const [key, value] of Object.entries(single)) {
    if (value) parts.push(String(value).replace(/-/g, ' '));
  }
  for (const values of Object.values(multi)) {
    if (Array.isArray(values)) {
      values.slice(0, 3).forEach((value) => parts.push(String(value).replace(/-/g, ' ')));
    }
  }

  return parts.slice(0, 5).join(' · ') || 'Saved custom bowl preset';
}

export default function CommunityPresetCard({ preset, onUse }) {
  const nutrition = estimateCustomizationNutrition({ slug: 'build-your-own-bowl' }, preset.customization || {});

  return (
    <article className="card community-preset-card">
      <div className="community-preset-card__top">
        <div>
          <p className="eyebrow">Community meal</p>
          <h3>{preset.title}</h3>
        </div>
        {preset.goal_tag && <span className="status-badge status-badge--ready">{preset.goal_tag}</span>}
      </div>
      <p className="muted small-text">{summarizeCustomization(preset.customization)}</p>
      <div className="community-preset-card__nutrition small-text">{formatNutritionLine(nutrition)}</div>
      <div className="community-preset-card__footer">
        <strong>{formatCurrency(preset.estimated_price || 0)}</strong>
        <button type="button" className="ghost-btn" onClick={() => onUse(preset)}>
          Use this meal
        </button>
      </div>
    </article>
  );
}
