import { seasoningAddons, builderSchema, isBuilderItem } from '../../src/lib/mealMeta.js';

export function toMoney(amount) {
  const value = Number(amount || 0);
  return Number.isInteger(value) ? value : Number(value.toFixed(2));
}

function findOptionPrice(group, selectedCode) {
  if (!group || !selectedCode) return 0;
  return group.options?.find((option) => option.code === selectedCode)?.price || 0;
}

function getEffectiveSchema(menuItem) {
  if (isBuilderItem(menuItem)) return builderSchema;
  return menuItem.customization_schema || menuItem.customizationSchema || {};
}

export function calculateLine(menuItem, customization = {}, quantity = 1, inventoryMap = {}) {
  const schema = getEffectiveSchema(menuItem);
  const singleChoice = schema.singleChoice || [];
  const multiChoice = schema.multiChoice || [];
  const optionQuantities = customization.optionQuantities || {};
  const addonQuantities = customization.addonQuantities || {};

  let unitPrice = Number(menuItem.base_price || menuItem.basePrice || 0);
  const normalized = {
    singleChoice: {},
    multiChoice: {},
    optionQuantities: {},
    addonQuantities: {},
    notes: customization.notes || '',
  };

  for (const group of singleChoice) {
    const selected = customization.singleChoice?.[group.key];
    if (group.required && !selected) throw new Error(`${group.label} is required.`);
    if (selected) {
      if (inventoryMap[selected] === false) throw new Error(`Option ${selected} is currently unavailable.`);
      unitPrice += findOptionPrice(group, selected);
      normalized.singleChoice[group.key] = selected;
    }
  }

  for (const group of multiChoice) {
    const selectedCodes = (customization.multiChoice?.[group.key] || []).filter(Boolean);
    const unavailable = selectedCodes.find((code) => inventoryMap[code] === false);
    if (unavailable) throw new Error(`Option ${unavailable} is currently unavailable.`);
    normalized.multiChoice[group.key] = selectedCodes;
    for (const code of selectedCodes) {
      const qty = Math.max(1, Number(optionQuantities[code] || 1));
      normalized.optionQuantities[code] = qty;
      unitPrice += findOptionPrice(group, code) * qty;
    }
  }

  for (const addon of seasoningAddons) {
    const qty = Math.max(0, Number(addonQuantities[addon.code] || 0));
    if (qty > 0) {
      normalized.addonQuantities[addon.code] = qty;
      unitPrice += (addon.price || 0) * qty;
    }
  }

  const qty = Math.max(1, Number(quantity || 1));
  return { unitPrice, lineTotal: unitPrice * qty, quantity: qty, customization: normalized };
}

export function computeCoins(subtotal, requestedCoins, currentCoins) {
  const safeCoins = Math.max(0, Math.min(Number(currentCoins || 0), Number(requestedCoins || 0)));
  const normalized = safeCoins - (safeCoins % 100);
  const maxBySubtotal = Math.floor(Number(subtotal || 0)) * 100;
  return Math.min(normalized, maxBySubtotal);
}
