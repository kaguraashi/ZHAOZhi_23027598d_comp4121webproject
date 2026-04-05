import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header({ cartCount, onOpenCart }) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link to="/" className="brand brand--desktop">
          <img src="/original-assets/icon.png" alt="Dishy" className="brand__logo" />
          <div>
            <strong>HK Home Dishes</strong>
            <div className="muted">家常風味</div>
          </div>
        </Link>

        <nav className="main-nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/orders">Orders</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin">Restaurant</NavLink>}
        </nav>

        <div className="site-header__actions">
          <button className="ghost-btn" onClick={onOpenCart}>Cart ({cartCount})</button>
          {user ? (
            <>
              <Link className={`user-chip ${location.pathname === '/profile' ? 'user-chip--active' : ''}`} to="/profile">
                <strong>{user.fullName || user.email?.split('@')[0] || 'User'}</strong>
                <span>{user.loyaltyCoins || 0} coins</span>
              </Link>
              <button className="ghost-btn" onClick={signOut}>Logout</button>
            </>
          ) : (
            <Link className="primary-btn" to="/auth">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
