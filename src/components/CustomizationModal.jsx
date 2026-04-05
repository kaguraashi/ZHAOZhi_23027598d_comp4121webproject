import { useEffect, useMemo, useState } from 'react';
import { estimateLinePrice, formatCurrency } from '../lib/pricing.js';

function getDefaultCustomization(item) {
  const schema = item?.customization_schema || item?.customizationSchema || {};
  const singleChoice = {};
  const multiChoice = {};
  for (const group of schema.singleChoice || []) {
    if (group.options?.[0]) singleChoice[group.key] = group.options[0].code;
  }
  for (const group of schema.multiChoice || []) {
    multiChoice[group.key] = [];
  }
  return { singleChoice, multiChoice, notes: '' };
}

export default function CustomizationModal({ item, inventoryMap, onClose, onAdd }) {
  const [customization, setCustomization] = useState(() => getDefaultCustomization(item));
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setCustomization(getDefaultCustomization(item));
    setQuantity(1);
  }, [item]);

  const schema = item?.customization_schema || item?.customizationSchema || {};
  const estimatedUnit = useMemo(() => (item ? estimateLinePrice(item, customization) : 0), [item, customization]);
  const estimatedTotal = estimatedUnit * quantity;

  if (!item) return null;

  function toggleMultiChoice(groupKey, code) {
    setCustomization((current) => {
      const selected = new Set(current.multiChoice[groupKey] || []);
      if (selected.has(code)) selected.delete(code);
      else selected.add(code);
      return {
        ...current,
        multiChoice: {
          ...current.multiChoice,
          [groupKey]: [...selected],
        },
      };
    });
  }

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
                        onChange={() =>
                          setCustomization((current) => ({
                            ...current,
                            singleChoice: { ...current.singleChoice, [group.key]: option.code },
                          }))
                        }
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
                  return (
                    <label key={option.code} className={`option-tile ${disabled ? 'option-tile--disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMultiChoice(group.key, option.code)}
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

          <section className="option-group">
            <h4>Special notes</h4>
            <textarea
              className="textarea"
              rows="3"
              value={customization.notes}
              onChange={(event) => setCustomization((current) => ({ ...current, notes: event.target.value }))}
              placeholder="No onion, extra sauce, pack cutlery separately..."
            />
          </section>

          <section className="option-group compact-row">
            <div>
              <h4>Quantity</h4>
              <div className="qty-picker">
                <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))}>-</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((current) => current + 1)}>+</button>
              </div>
            </div>
            <div className="price-box">
              <span>Estimated total</span>
              <strong>{formatCurrency(estimatedTotal)}</strong>
            </div>
          </section>
        </div>

        <div className="modal__footer">
          <button type="button" className="primary-btn" onClick={() => onAdd(customization, quantity)}>
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
