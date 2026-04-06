export function formatCustomization(customization) {
  if (!customization) return [];
  const lines = [];
  const single = customization.singleChoice || {};
  const multi = customization.multiChoice || {};

  for (const [key, value] of Object.entries(single)) {
    if (!value) continue;
    lines.push(`${toLabel(key)}: ${toLabel(value)}`);
  }

  for (const [key, values] of Object.entries(multi)) {
    if (!Array.isArray(values) || !values.length) continue;
    lines.push(`${toLabel(key)}: ${values.map(toLabel).join(', ')}`);
  }

  if (customization.notes) {
    lines.push(`Meal note: ${customization.notes}`);
  }

  return lines;
}

export function shortOrderId(id) {
  if (!id) return '------';
  return id.slice(-6).toUpperCase();
}

function toLabel(value) {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
