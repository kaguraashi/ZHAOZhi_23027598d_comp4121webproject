import { useEffect, useMemo, useState } from 'react';
import { estimateLinePrice, formatCurrency, getEffectiveSchema } from '../lib/pricing.js';
import { applyBuilderPreset, builderSchema, estimateCustomizationNutrition, isBuilderItem, seasoningAddons } from '../lib/mealMeta.js';

function getDefaultCustomization(item) {
  const schema = getEffectiveSchema(item);
  const singleChoice = {};
  const multiChoice = {};
  for (const group of schema.singleChoice || []) {
    if (group.options?.[0]) singleChoice[group.key] = group.options[0].code;
  }
  for (const group of schema.multiChoice || []) {
    multiChoice[group.key] = [];
  }
  return { singleChoice, multiChoice, optionQuantities: {}, addonQuantities: {}, notes: '' };
}

function mergeCustomization(item, initialCustomization) {
  const base = getDefaultCustomization(item);
  if (!initialCustomization) return base;
  return {
    singleChoice: { ...base.singleChoice, ...(initialCustomization.singleChoice || {}) },
    multiChoice: { ...base.multiChoice, ...(initialCustomization.multiChoice || {}) },
    optionQuantities: { ...(initialCustomization.optionQuantities || {}) },
    addonQuantities: { ...(initialCustomization.addonQuantities || {}) },
    notes: initialCustomization.notes || '',
  };
}

const emptyNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export default function CustomizationModal({ item, inventoryMap, onClose, onAdd, initialCustomization, onSavePreset, canSavePreset }) {
  const [customization, setCustomization] = useState(() => mergeCustomization(item, initialCustomization));
  const [quantity, setQuantity] = useState(1);
  const [presetTitle, setPresetTitle] = useState('');
  const [goalTag, setGoalTag] = useState('');
  const [sharePreset, setSharePreset] = useState(true);
  const [presetMessage, setPresetMessage] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);

  useEffect(() => {
    setCustomization(mergeCustomization(item, initialCustomization));
    setQuantity(1);
    setPresetTitle(isBuilderItem(item) ? 'My custom bowl' : `${item?.name || 'Meal'} preset`);
    setGoalTag('');
    setSharePreset(true);
    setPresetMessage('');
  }, [item, initialCustomization]);

  const schema = useMemo(() => getEffectiveSchema(item), [item]);
  const estimatedUnit = useMemo(() => (item ? estimateLinePrice(item, customization) : 0), [item, customization]);
  const estimatedTotal = estimatedUnit * quantity;
  const liveNutrition = useMemo(
    () => (item ? estimateCustomizationNutrition(item, customization) : emptyNutrition),
    [item, customization]
  );
  const isBuilder = isBuilderItem(item);

  if (!item) return null;

  function toggleMultiChoice(groupKey, code) {
    setCustomization((current) => {
      const selected = new Set(current.multiChoice[groupKey] || []);
      const optionQuantities = { ...(current.optionQuantities || {}) };
      if (selected.has(code)) {
        selected.delete(code);
        delete optionQuantities[code];
      } else {
        selected.add(code);
        optionQuantities[code] = 1;
      }
      return {
        ...current,
        multiChoice: { ...current.multiChoice, [groupKey]: [...selected] },
        optionQuantities,
      };
    });
  }

  function setOptionQuantity(code, nextQty) {
    setCustomization((current) => ({
      ...current,
      optionQuantities: {
        ...(current.optionQuantities || {}),
        [code]: Math.max(1, Math.min(5, nextQty)),
      },
    }));
  }

  function setAddonQuantity(code, nextQty) {
    setCustomization((current) => {
      const addonQuantities = { ...(current.addonQuantities || {}) };
      const normalized = Math.max(0, Math.min(5, nextQty));
      if (!normalized) delete addonQuantities[code];
      else addonQuantities[code] = normalized;
      return { ...current, addonQuantities };
    });
  }

  async function handleSavePreset() {
    if (!onSavePreset) return;
    setSavingPreset(true);
    setPresetMessage('');
    try {
      await onSavePreset({
        menuItemId: item.id,
        menuItemSlug: item.slug || item.id,
        title: presetTitle.trim() || 'My custom bowl',
        goalTag,
        customization,
        estimatedPrice: estimatedUnit,
        isPublic: sharePreset,
      });
      setPresetMessage('Saved.');
    } catch (error) {
      setPresetMessage(error.message || 'Could not save.');
    } finally {
      setSavingPreset(false);
    }
  }

  const nutritionLine = `${liveNutrition.calories} kcal · ${liveNutrition.protein}g protein · ${liveNutrition.carbs}g carbs · ${liveNutrition.fat}g fat`;
  const totalNutrition = {
    calories: liveNutrition.calories * quantity,
    protein: liveNutrition.protein * quantity,
    carbs: liveNutrition.carbs * quantity,
    fat: liveNutrition.fat * quantity,
  };
  const totalNutritionLine = `${totalNutrition.calories} kcal · ${totalNutrition.protein}g protein · ${totalNutrition.carbs}g carbs · ${totalNutrition.fat}g fat`;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2>{item.name}</h2>
            <p className="muted">{item.description}</p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose}>Close</button>
        </div>

        <div className="modal__content">
          {isBuilder && (
            <section className="option-group builder-quick-presets">
              <div className="compact-row compact-row--top">
                <div>
                  <h4>Quick picks</h4>
                  <p className="muted small-text">Start with a ready-made mix.</p>
                </div>
              </div>
              <div className="builder-quick-presets__row">
                {['Office lunch', 'High protein', 'Lighter'].map((preset) => (
                  <button key={preset} type="button" className="ghost-btn" onClick={() => setCustomization((current) => applyBuilderPreset(preset, current))}>{preset}</button>
                ))}
              </div>
            </section>
          )}

          <section className="option-group nutrition-box">
            <div className="compact-row compact-row--top">
              <div>
                <h4>Nutrition</h4>
                <p className="muted small-text">Per bowl. Order total updates below.</p>
              </div>
            </div>
            <div className="nutrition-grid">
              <div className="nutrition-tile"><strong>{liveNutrition.calories}</strong><span>kcal</span></div>
              <div className="nutrition-tile"><strong>{liveNutrition.protein}g</strong><span>protein</span></div>
              <div className="nutrition-tile"><strong>{liveNutrition.carbs}g</strong><span>carbs</span></div>
              <div className="nutrition-tile"><strong>{liveNutrition.fat}g</strong><span>fat</span></div>
            </div>
            {quantity > 1 && (
              <div className="muted small-text nutrition-total-line">
                Total for {quantity} bowls: {liveNutrition.calories * quantity} kcal · {liveNutrition.protein * quantity}g protein · {liveNutrition.carbs * quantity}g carbs · {liveNutrition.fat * quantity}g fat
              </div>
            )}
          </section>

          {(schema.singleChoice || []).map((group) => (
            <section key={group.key} className="option-group">
              <h4>{group.label}</h4>
              <div className="option-grid">
                {group.options.map((option) => {
                  const disabled = inventoryMap[option.code] === false;
                  return (
                    <label key={option.code} className={`option-tile ${disabled ? 'option-tile--disabled' : ''}`}>
                      <input
                        type="radio"
                        name={group.key}
                        checked={customization.singleChoice[group.key] === option.code}
                        onChange={() => setCustomization((current) => ({ ...current, singleChoice: { ...current.singleChoice, [group.key]: option.code } }))}
                        disabled={disabled}
                      />
                      <span>{option.label}</span>
                      <strong>{option.price ? `+${formatCurrency(option.price)}` : 'Included'}</strong>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          {(schema.multiChoice || []).map((group) => (
            <section key={group.key} className="option-group">
              <h4>{group.label}</h4>
              <div className="option-grid">
                {group.options.map((option) => {
                  const disabled = inventoryMap[option.code] === false;
                  const checked = customization.multiChoice[group.key]?.includes(option.code);
                  const selectedQty = customization.optionQuantities?.[option.code] || 1;
                  return (
                    <div key={option.code} className={`option-tile option-tile--qty ${disabled ? 'option-tile--disabled' : ''}`}>
                      <label className="option-tile__main">
                        <input type="checkbox" checked={checked} onChange={() => toggleMultiChoice(group.key, option.code)} disabled={disabled} />
                        <span>{option.label}</span>
                        <strong>{option.price ? `+${formatCurrency(option.price)}` : 'Included'}</strong>
                      </label>
                      {checked && !disabled && (
                        <div className="inline-stepper">
                          <button type="button" onClick={() => setOptionQuantity(option.code, selectedQty - 1)}>-</button>
                          <span>{selectedQty}</span>
                          <button type="button" onClick={() => setOptionQuantity(option.code, selectedQty + 1)}>+</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="option-group">
            <div className="compact-row compact-row--top">
              <div>
                <h4>Extra seasoning</h4>
                <p className="muted small-text">Adjust small add-ons here.</p>
              </div>
            </div>
            <div className="option-grid">
              {seasoningAddons.map((addon) => {
                const qty = customization.addonQuantities?.[addon.code] || 0;
                return (
                  <div key={addon.code} className="option-tile option-tile--qty">
                    <div className="option-tile__main">
                      <span>{addon.label}</span>
                      <strong>{addon.price ? `+${formatCurrency(addon.price)}` : 'Included'}</strong>
                    </div>
                    <div className="inline-stepper">
                      <button type="button" onClick={() => setAddonQuantity(addon.code, qty - 1)}>-</button>
                      <span>{qty}</span>
                      <button type="button" onClick={() => setAddonQuantity(addon.code, qty + 1)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="option-group">
            <h4>Meal note</h4>
            <textarea className="textarea" rows="3" value={customization.notes} onChange={(event) => setCustomization((current) => ({ ...current, notes: event.target.value }))} placeholder="For this meal only" />
          </section>

          {isBuilder && canSavePreset && (
            <section className="option-group preset-save-box">
              <div className="compact-row compact-row--top">
                <div>
                  <h4>Save meal</h4>
                  <p className="muted small-text">Keep it for next time.</p>
                </div>
              </div>
              <div className="checkout-grid">
                <label>
                  <span>Name</span>
                  <input value={presetTitle} onChange={(event) => setPresetTitle(event.target.value)} placeholder="My lunch bowl" />
                </label>
                <label>
                  <span>Tag</span>
                  <select value={goalTag} onChange={(event) => setGoalTag(event.target.value)}>
                    <option value="">No tag</option>
                    <option value="High protein">High protein</option>
                    <option value="Budget meal">Budget meal</option>
                    <option value="Light meal">Light meal</option>
                    <option value="Comfort food">Comfort food</option>
                  </select>
                </label>
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={sharePreset} onChange={(event) => setSharePreset(event.target.checked)} />
                <span>Show in community meals</span>
              </label>
              <div className="preset-save-box__actions">
                <button type="button" className="ghost-btn" onClick={handleSavePreset} disabled={savingPreset}>{savingPreset ? 'Saving…' : 'Save meal'}</button>
                {presetMessage && <span className="muted small-text">{presetMessage}</span>}
              </div>
            </section>
          )}

          <section className="option-group compact-row">
            <div>
              <h4>Quantity</h4>
              <div className="qty-picker">
                <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))}>-</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((current) => Math.min(12, current + 1))}>+</button>
              </div>
            </div>
            <div className="price-box">
              <span>Total</span>
              <strong>{formatCurrency(estimatedTotal)}</strong>
              <small className="muted">{quantity > 1 ? totalNutritionLine : nutritionLine}</small>
            </div>
          </section>
        </div>

        <div className="modal__footer">
          <button type="button" className="primary-btn" onClick={() => onAdd(customization, quantity)}>Add to cart</button>
        </div>
      </div>
    </div>
  );
}
