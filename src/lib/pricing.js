import { seasoningAddons, builderSchema, isBuilderItem } from './mealMeta.js';

export function formatCurrency(amount) {
  const value = Number(amount || 0);
  return `HK$${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

function getOptionPrice(options, selectedCode) {
  return options?.find((option) => option.code === selectedCode)?.price || 0;
}

export function getEffectiveSchema(item) {
  if (isBuilderItem(item)) return builderSchema;
  return item?.customization_schema || item?.customizationSchema || {};
}

export function estimateLinePrice(item, customization) {
  if (!item) return 0;

  const schema = getEffectiveSchema(item);
  const optionQuantities = customization?.optionQuantities || {};
  const addonQuantities = customization?.addonQuantities || {};
  let unitPrice = Number(item.base_price || item.basePrice || 0);

  for (const group of schema.singleChoice || []) {
    const selected = customization?.singleChoice?.[group.key];
    unitPrice += getOptionPrice(group.options, selected);
  }

  for (const group of schema.multiChoice || []) {
    const selected = customization?.multiChoice?.[group.key] || [];
    for (const code of selected) {
      const qty = Math.max(1, Number(optionQuantities[code] || 1));
      unitPrice += getOptionPrice(group.options, code) * qty;
    }
  }

  for (const addon of seasoningAddons) {
    const qty = Math.max(0, Number(addonQuantities[addon.code] || 0));
    unitPrice += (addon.price || 0) * qty;
  }

  return unitPrice;
}

export function orderStatusLabel(status) {
  return (
    {
      received: 'Received',
      cooking: 'Cooking',
      ready: 'Ready',
      out_for_delivery: 'Out for delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    }[status] || status
  );
}
