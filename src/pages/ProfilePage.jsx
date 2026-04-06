import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCurrency } from '../lib/pricing.js';

const SETTINGS_KEY = 'dishy-settings-draft';

function readSettings() {
  if (typeof localStorage === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
  } catch {
    return null;
  }
}

function SoonTag() {
  return <span className="soon-tag">Available soon</span>;
}

export default function ProfilePage({ orders, savedPresets, onUsePreset }) {
  const { user, signOut } = useAuth();
  const settings = readSettings() || {};

  if (!user) {
    return (
      <div className="page-shell shell gated-page">
        <section className="card gated-card">
          <p className="eyebrow">Profile</p>
          <h1>Sign in to see saved meals, coins, and order details.</h1>
          <p className="muted">You can still browse the menu as a guest.</p>
          <div className="gated-actions">
            <Link className="primary-btn" to="/auth">Sign in</Link>
            <Link className="ghost-btn" to="/">Back to menu</Link>
          </div>
        </section>
      </div>
    );
  }
  const completedOrders = (orders || []).filter((o) => o.status === 'delivered').length;
  const totalSpent = (orders || [])
    .filter((o) => o.status === 'delivered')
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const officeLunchOrders = (orders || []).filter((o) => o.order_type === 'delivery').length;

  const summaryItems = [
    { icon: '🍱', label: 'Saved meals', value: `${savedPresets.length}` },
    { icon: '⭐', label: 'Coins', value: `${user.loyaltyCoins || 0}` },
    { icon: '📦', label: 'Delivered', value: `${completedOrders}` },
    { icon: '🏢', label: 'Office delivery', value: `${officeLunchOrders}` },
  ];

  return (
    <div className="page-shell shell profile-layout-web">
      <section className="card profile-main-card stack-list">
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
            <div className="stat-card-web__icon">📦</div>
            <strong>{completedOrders}</strong>
            <span>Delivered</span>
          </article>
          <article className="card card--nested stat-card-web">
            <div className="stat-card-web__icon">💰</div>
            <strong>{formatCurrency(totalSpent)}</strong>
            <span>Spent</span>
          </article>
        </div>

        <section className="card card--nested loyalty-box-web">
          <div className="section-heading section-heading--tight">
            <div>
              <p className="eyebrow">Loyalty</p>
              <h2>Earn 1 coin per HK$1</h2>
            </div>
          </div>
          <p className="muted">100 coins = HK$1 off.</p>
          <div className="loyalty-progress-web">
            <div className="loyalty-progress-web__bar">
              <div className="loyalty-progress-web__fill" style={{ width: `${Math.min(((user.loyaltyCoins || 0) % 500) / 5, 100)}%` }} />
            </div>
            <div className="muted small-text">{500 - ((user.loyaltyCoins || 0) % 500)} to next reward</div>
          </div>
        </section>

        <section className="card card--nested profile-health-card">
          <div className="section-heading section-heading--tight">
            <div>
              <p className="eyebrow">Health management</p>
              <h2>Your meal targets</h2>
            </div>
            <Link className="ghost-btn" to="/settings">Edit</Link>
          </div>
          <div className="profile-health-grid">
            <div className="profile-health-tile">
              <strong>{settings.mainGoal || 'Balanced'}</strong>
              <span>Goal</span>
            </div>
            <div className="profile-health-tile">
              <strong>{settings.targetCalories || '650'} kcal</strong>
              <span>Target / meal</span>
            </div>
            <div className="profile-health-tile">
              <strong>{settings.targetProtein || '30'} g</strong>
              <span>Protein / meal</span>
            </div>
            <div className="profile-health-tile">
              <strong>{settings.destination || 'Office'}</strong>
              <span>Default destination</span>
            </div>
          </div>
          <div className="profile-health-notes muted small-text">
            <div><strong>Avoid:</strong> {settings.avoidIngredients || 'None set'}</div>
            <div><strong>Allergies:</strong> {settings.allergies || 'None set'}</div>
          </div>
        </section>

        <section className="card card--nested">
          <div className="section-heading section-heading--tight">
            <div>
              <p className="eyebrow">Saved meals</p>
              <h2>Use again</h2>
            </div>
          </div>
          {!savedPresets.length ? (
            <div className="muted small-text">Save a custom bowl first.</div>
          ) : (
            <div className="saved-preset-list">
              {savedPresets.map((preset) => (
                <div key={preset.id} className="saved-preset-line">
                  <div>
                    <strong>{preset.title}</strong>
                    <div className="muted small-text">{preset.goal_tag || 'Custom meal'} · {formatCurrency(preset.estimated_price || 0)}</div>
                  </div>
                  <button type="button" className="ghost-btn" onClick={() => onUsePreset?.(preset)}>Use again</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <aside className="profile-side-column">
        <section className="card">
          <p className="eyebrow">Account</p>
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
          <Link className="ghost-btn quick-link-btn" to="/settings">Settings</Link>
          <div className="soon-row"><span>Change password</span><SoonTag /></div>
          <div className="soon-row"><span>MFA</span><SoonTag /></div>
          <div className="soon-row"><span>Contact us</span><SoonTag /></div>
          <div className="soon-row"><span>Merchant support</span><SoonTag /></div>
          {user.role === 'admin' && <Link className="ghost-btn quick-link-btn" to="/admin">Restaurant dashboard</Link>}
          <button className="primary-btn quick-link-btn" onClick={signOut}>Sign out</button>
        </section>
      </aside>
    </div>
  );
}
