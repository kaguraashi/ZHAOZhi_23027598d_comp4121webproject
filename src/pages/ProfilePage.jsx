import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCurrency } from '../lib/pricing.js';

export default function ProfilePage({ orders }) {
  const { user, signOut } = useAuth();

  if (!user) return <Navigate to="/auth" replace />;

  const deliveredOrders = (orders || []).filter((o) => o.status === 'delivered');
  const totalSpent = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const lastOrder = orders?.[0] || null;
  const preferredType = pickPreferredType(orders || []);

  const summaryItems = [
    { icon: '🧺', label: 'Preferred order type', value: preferredType },
    { icon: '🕒', label: 'Last slot used', value: lastOrder ? formatProfileSlot(lastOrder) : 'No order yet' },
    { icon: '🍽️', label: 'Current focus', value: 'Regular dishes + build your own meal' },
    { icon: '📦', label: 'Tracking', value: 'Order history and live status available' },
  ];

  return (
    <div className="page-shell shell profile-layout-web">
      <section className="card profile-main-card">
        <div className="profile-header-web">
          <div className="profile-avatar">👤</div>
          <div>
            <h1>{user.fullName || user.email || 'User'}</h1>
            <p className="muted">{user.email}</p>
          </div>
        </div>

        <div className="profile-stat-grid">
          <article className="card card--nested stat-card-web">
            <div className="stat-card-web__icon">⭐</div>
            <strong>{user.loyaltyCoins || 0}</strong>
            <span>Coins</span>
          </article>
          <article className="card card--nested stat-card-web">
            <div className="stat-card-web__icon">📋</div>
            <strong>{deliveredOrders.length}</strong>
            <span>Delivered orders</span>
          </article>
          <article className="card card--nested stat-card-web">
            <div className="stat-card-web__icon">💰</div>
            <strong>{formatCurrency(totalSpent)}</strong>
            <span>Total spent</span>
          </article>
        </div>

        <section className="card card--nested loyalty-box-web">
          <div className="section-heading section-heading--tight">
            <div>
              <p className="eyebrow">Loyalty program</p>
              <h2>Earn 1 coin per HK$1 spent</h2>
            </div>
          </div>
          <p className="muted">Redeem 100 coins for HK$1 off. Maximum redemption is 50% of the order total.</p>
          <div className="loyalty-progress-web">
            <div className="loyalty-progress-web__bar">
              <div className="loyalty-progress-web__fill" style={{ width: `${Math.min(((user.loyaltyCoins || 0) % 500) / 5, 100)}%` }} />
            </div>
            <div className="muted small-text">{500 - ((user.loyaltyCoins || 0) % 500)} coins to next reward</div>
          </div>
        </section>
      </section>

      <aside className="profile-side-column">
        <section className="card">
          <p className="eyebrow">Account summary</p>
          <div className="menu-list-web">
            {summaryItems.map((item) => (
              <div className="menu-line-web" key={item.label}>
                <div><span>{item.icon}</span><strong>{item.label}</strong></div>
                <span className="muted small-text">{item.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card quick-links-card">
          <Link className="ghost-btn quick-link-btn" to="/orders">View orders</Link>
          <Link className="ghost-btn quick-link-btn" to="/">Back to menu</Link>
          {user.role === 'admin' && <Link className="ghost-btn quick-link-btn" to="/admin">Restaurant dashboard</Link>}
          <button className="primary-btn quick-link-btn" onClick={signOut}>Sign out</button>
        </section>
      </aside>
    </div>
  );
}

function pickPreferredType(orders) {
  if (!orders.length) return 'Not enough data';
  const counts = orders.reduce((acc, order) => {
    acc[order.order_type] = (acc[order.order_type] || 0) + 1;
    return acc;
  }, {});
  const [top] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  if (!top) return 'Not enough data';
  if (top === 'pickup') return 'Pickup';
  if (top === 'delivery') return 'Delivery';
  if (top === 'dine_in') return 'Dine in';
  return top;
}

function formatProfileSlot(order) {
  if (order.scheduled_slot) return order.scheduled_slot;
  if (order.order_type === 'pickup' || order.order_type === 'delivery') return 'ASAP';
  if (order.order_type === 'dine_in') return 'Walk-in';
  return 'Not set';
}
