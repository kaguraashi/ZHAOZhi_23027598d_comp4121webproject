export function formatCurrency(cents) {
  return `HK$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function getOptionPrice(options, selectedCode) {
  return options?.find((option) => option.code === selectedCode)?.price || 0;
}

export function estimateLinePrice(item, customization) {
  if (!item) return 0;

  const schema = item.customization_schema || item.customizationSchema || {};
  let unitPrice = Number(item.base_price || item.basePrice || 0);

  for (const group of schema.singleChoice || []) {
    const selected = customization?.singleChoice?.[group.key];
    unitPrice += getOptionPrice(group.options, selected);
  }

  for (const group of schema.multiChoice || []) {
    const selected = customization?.multiChoice?.[group.key] || [];
    for (const code of selected) {
      unitPrice += getOptionPrice(group.options, code);
    }
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
