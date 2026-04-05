export function toMoney(cents) {
  return Number((cents / 100).toFixed(2));
}

function findOptionPrice(group, selectedCode) {
  if (!group || !selectedCode) return 0;
  return group.options?.find((option) => option.code === selectedCode)?.price || 0;
}

function findMultiplePrice(group, selectedCodes) {
  if (!group || !Array.isArray(selectedCodes)) return 0;
  const selected = new Set(selectedCodes);
  return (group.options || []).reduce((sum, option) => sum + (selected.has(option.code) ? option.price || 0 : 0), 0);
}

export function calculateLine(menuItem, customization = {}, quantity = 1, inventoryMap = {}) {
  const schema = menuItem.customization_schema || menuItem.customizationSchema || {};
  const singleChoice = schema.singleChoice || [];
  const multiChoice = schema.multiChoice || [];

  let unitPrice = Number(menuItem.base_price || menuItem.basePrice || 0);
  const normalized = { singleChoice: {}, multiChoice: {}, notes: customization.notes || '' };

  for (const group of singleChoice) {
    const selected = customization.singleChoice?.[group.key];
    if (group.required && !selected) {
      throw new Error(`${group.label} is required.`);
    }
    if (selected) {
      if (inventoryMap[selected] === false) {
        throw new Error(`Option ${selected} is currently unavailable.`);
      }
      unitPrice += findOptionPrice(group, selected);
      normalized.singleChoice[group.key] = selected;
    }
  }

  for (const group of multiChoice) {
    const selectedCodes = (customization.multiChoice?.[group.key] || []).filter(Boolean);
    const unavailable = selectedCodes.find((code) => inventoryMap[code] === false);
    if (unavailable) {
      throw new Error(`Option ${unavailable} is currently unavailable.`);
    }
    unitPrice += findMultiplePrice(group, selectedCodes);
    normalized.multiChoice[group.key] = selectedCodes;
  }

  const qty = Math.max(1, Number(quantity || 1));
  return {
    unitPrice,
    lineTotal: unitPrice * qty,
    quantity: qty,
    customization: normalized,
  };
}

export function computeCoins(subtotal, requestedCoins, currentCoins) {
  const safeCoins = Math.max(0, Math.min(Number(currentCoins || 0), Number(requestedCoins || 0)));
  const normalized = safeCoins - (safeCoins % 100);
  const maxBySubtotal = Math.floor(Number(subtotal || 0) / 100) * 100;
  return Math.min(normalized, maxBySubtotal);
}
