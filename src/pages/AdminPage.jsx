import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatCurrency, orderStatusLabel } from '../lib/pricing.js';
import { formatCustomization, shortOrderId } from '../lib/orderFormatting.js';

const statusSequence = ['received', 'cooking', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

export default function AdminPage({ orders, inventoryFlags, onRefresh, onToggleInventory, onUpdateStatus, onBootstrapAdmin }) {
  const { user } = useAuth();
  const [secret, setSecret] = useState('');
  const [bootstrapMessage, setBootstrapMessage] = useState('');

  if (!user) return <Navigate to="/auth" replace />;

  if (user.role !== 'admin') {
    return (
      <div className="page-shell shell narrow-shell">
        <section className="card auth-card">
          <p className="eyebrow">Restaurant dashboard</p>
          <h1>This account is still a customer</h1>
          <p className="muted">Use the admin bootstrap secret from your env to promote this account for restaurant mode.</p>
          <form
            className="auth-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await onBootstrapAdmin(secret);
              setBootstrapMessage(result);
              setSecret('');
            }}
          >
            <label>
              ADMIN_SEED_SECRET
              <input value={secret} onChange={(event) => setSecret(event.target.value)} required />
            </label>
            <button className="primary-btn">Promote this account</button>
          </form>
          {bootstrapMessage && <div className="alert alert--success">{bootstrapMessage}</div>}
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell shell admin-layout admin-layout--wide">
      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Restaurant queue</p>
            <h1>Manage incoming orders</h1>
          </div>
          <button className="ghost-btn" onClick={onRefresh}>Refresh</button>
        </div>

        <div className="stack-list">
          {orders.map((order) => (
            <article key={order.id} className="card card--nested order-card">
              <div className="order-card__header">
                <div>
                  <h3>Order #{shortOrderId(order.id)} · {order.customer_name}</h3>
                  <p className="muted">{new Date(order.created_at).toLocaleString('en-HK')}</p>
                </div>
                <div className="order-card__summary">
                  <StatusBadge status={order.status} />
                  <strong>{formatCurrency(order.total)}</strong>
                </div>
              </div>

              <div className="order-card__details">
                <div><span>Type</span><strong>{beautify(order.order_type)}</strong></div>
                <div><span>Slot</span><strong>{order.scheduled_slot || 'ASAP'}</strong></div>
                <div><span>Email</span><strong>{order.customer_email}</strong></div>
                <div><span>Priority</span><strong>{order.priority_delivery ? 'Yes' : 'No'}</strong></div>
              </div>

              {(order.order_items || []).map((item) => {
                const lines = formatCustomization(item.customization);
                return (
                  <div key={item.id} className="line-item">
                    <div>
                      <strong>{item.title}</strong>
                      <div className="muted small-text">Qty {item.quantity}</div>
                      {lines.map((line) => (
                        <div className="muted small-text" key={line}>{line}</div>
                      ))}
                    </div>
                    <strong>{formatCurrency(item.line_total)}</strong>
                  </div>
                );
              })}

              <div className="status-actions">
                {statusSequence.map((status) => (
                  <button key={status} className="ghost-btn" onClick={() => onUpdateStatus(order.id, status)}>
                    {orderStatusLabel(status)}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Inventory flags</p>
        <h2>Disable unavailable customization options</h2>
        <div className="stack-list stack-list--tight">
          {inventoryFlags.map((flag) => (
            <div key={flag.ingredient_code} className="line-item">
              <div>
                <strong>{flag.label}</strong>
                <div className="muted small-text">{flag.ingredient_code}</div>
              </div>
              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={flag.is_available}
                  onChange={(event) => onToggleInventory(flag.ingredient_code, event.target.checked)}
                />
                <span>{flag.is_available ? 'Available' : 'Hidden'}</span>
              </label>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function beautify(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}
