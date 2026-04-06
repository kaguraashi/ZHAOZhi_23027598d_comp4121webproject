import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function MerchantLoginPage() {
  const [message, setMessage] = useState('');

  function handleSoon() {
    setMessage('Merchant sign in will open soon. Please use customer sign in for ordering for now.');
  }

  return (
    <div className="page-shell shell auth-layout-web">
      <section className="card auth-promo">
        <p className="eyebrow">Merchant</p>
        <h1>For shops handling orders and updating progress.</h1>
        <ul className="auth-promo__list">
          <li>View new orders quickly.</li>
          <li>Update order progress in one place.</li>
          <li>More merchant tools are opening soon.</li>
        </ul>
      </section>

      <section className="card auth-card auth-card--desktop">
        <p className="eyebrow">Merchant sign in</p>
        <h2>Store access</h2>
        <p className="muted">This entry is reserved for restaurant teams.</p>
        <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            Work email
            <input type="email" placeholder="shop@example.com" disabled />
          </label>
          <label>
            Password
            <input type="password" placeholder="Password" disabled />
          </label>
          <button className="primary-btn" type="button" onClick={handleSoon}>Available soon</button>
        </form>
        <div className="alert alert--warning">Merchant onboarding is opening soon.</div>
        {message && <div className="alert alert--success">{message}</div>}
        <div className="auth-card__actions auth-card__actions--stack">
          <Link className="ghost-btn auth-toggle" to="/auth">Back to customer sign in</Link>
          <Link className="ghost-btn auth-toggle" to="/settings">Contact us</Link>
        </div>
      </section>
    </div>
  );
}
