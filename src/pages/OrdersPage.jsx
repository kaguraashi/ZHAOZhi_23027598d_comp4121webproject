import StatusBadge from '../components/StatusBadge.jsx';
import { formatCurrency } from '../lib/pricing.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';
import { formatCustomization, shortOrderId } from '../lib/orderFormatting.js';

export default function OrdersPage({ orders, loading, onRefresh }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="page-shell shell narrow-shell">
        <section className="card empty-box">
          <h2>Login required</h2>
          <p>You can browse the menu without login, but order history belongs to your account.</p>
          <Link className="primary-btn" to="/auth">Go to login</Link>
        </section>
      </div>
    );
  }

  const activeOrders = (orders || []).filter((o) => ['received', 'cooking', 'ready', 'out_for_delivery'].includes(o.status));
  const pastOrders = (orders || []).filter((o) => !['received', 'cooking', 'ready', 'out_for_delivery'].includes(o.status));

  return (
    <div className="page-shell shell orders-layout-web">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Orders</p>
          <h1>Track your current and past orders</h1>
        </div>
        <button type="button" className="ghost-btn" onClick={onRefresh}>Refresh</button>
      </section>

      {loading && <div className="card empty-box">Loading orders...</div>}
      {!loading && !orders.length && <div className="card empty-box">No orders yet.</div>}

      {!!activeOrders.length && (
        <section className="orders-section-web">
          <h2>Active orders</h2>
          <div className="stack-list">
            {activeOrders.map((order) => (
              <OrderArticle order={order} key={order.id} />
            ))}
          </div>
        </section>
      )}

      {!!pastOrders.length && (
        <section className="orders-section-web">
          <h2>Order history</h2>
          <div className="stack-list">
            {pastOrders.map((order) => (
              <OrderArticle order={order} key={order.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OrderArticle({ order }) {
  return (
    <article className="card order-web-card">
      <div className="order-web-card__header">
        <div>
          <h3>Order #{shortOrderId(order.id)}</h3>
          <p className="muted">{new Date(order.created_at).toLocaleString('en-HK')}</p>
        </div>
        <div className="order-web-card__summary">
          <StatusBadge status={order.status} />
          <strong>{formatCurrency(order.total)}</strong>
        </div>
      </div>

      <div className="order-web-card__meta">
        <div><span>Type</span><strong>{beautify(order.order_type)}</strong></div>
        <div><span>Slot</span><strong>{formatOrderSlot(order)}</strong></div>
        <div><span>Coins used</span><strong>{order.coins_redeemed}</strong></div>
        <div><span>Coins earned</span><strong>{order.earned_coins}</strong></div>
      </div>

      {order.notes && (
        <div className="order-web-card__note muted">
          <strong>Order note:</strong> {order.notes}
        </div>
      )}

      <div className="order-web-card__items">
        {(order.order_items || []).map((item) => {
          const lines = formatCustomization(item.customization);
          return (
            <div key={item.id} className="order-item-web">
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
      </div>
    </article>
  );
}

function beautify(value) {
  const map = {
    pickup: 'Pickup',
    delivery: 'Delivery',
    dine_in: 'Dine in',
    out_for_delivery: 'Out for delivery',
  };
  return map[value] || String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatOrderSlot(order) {
  if (order.scheduled_slot) return order.scheduled_slot;
  if (order.order_type === 'pickup' || order.order_type === 'delivery') return 'ASAP / no slot chosen';
  if (order.order_type === 'dine_in') return 'Walk-in / no reservation';
  return 'Not selected';
}
