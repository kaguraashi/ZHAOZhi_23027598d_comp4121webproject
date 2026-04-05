import { orderStatusLabel } from '../lib/pricing.js';

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-badge--${status}`}>{orderStatusLabel(status)}</span>;
}
