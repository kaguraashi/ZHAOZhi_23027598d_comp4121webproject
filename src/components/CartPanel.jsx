import { useMemo, useState } from 'react';
import { formatCurrency } from '../lib/pricing.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCustomization } from '../lib/orderFormatting.js';

const defaultCheckout = {
  customerName: '',
  customerEmail: '',
  orderType: 'pickup',
  scheduledSlot: '',
  priorityDelivery: false,
  deliveryAddress: '',
  notes: '',
  coinsRedeemed: 0,
};

export default function CartPanel({ open, cartItems, user, onClose, onUpdateQty, onRemove, onCheckout }) {
  const { hasSupabaseEnv } = useAuth();
  const [checkoutForm, setCheckoutForm] = useState(defaultCheckout);
  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.lineTotal, 0), [cartItems]);
  const maxRedeemableCoins = Math.min(Math.floor(subtotal / 100) * 100, user?.loyaltyCoins || 0);
  const normalizedRedeem = Math.min(maxRedeemableCoins, checkoutForm.coinsRedeemed - (checkoutForm.coinsRedeemed % 100));
  const deliveryFee = checkoutForm.orderType === 'delivery' ? (checkoutForm.priorityDelivery ? 1200 : 600) : 0;
  const total = Math.max(0, subtotal + deliveryFee - normalizedRedeem);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      ...checkoutForm,
      customerName: checkoutForm.customerName || user?.fullName || '',
      customerEmail: checkoutForm.customerEmail || user?.email || '',
      coinsRedeemed: normalizedRedeem,
    };
    await onCheckout(payload);
    setCheckoutForm(defaultCheckout);
  }

  return (
    <div className="overlay overlay--right" onClick={onClose}>
      <aside className="drawer cart-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer__header">
          <div>
            <h2>Your cart</h2>
            <p className="muted">Review items, pick a time slot, and place your order.</p>
          </div>
          <button className="ghost-btn" onClick={onClose}>Close</button>
        </div>

        <div className="drawer__body">
          {!cartItems.length && <div className="empty-box">No items yet.</div>}

          {cartItems.map((item) => {
            const customLines = formatCustomization(item.customization);
            return (
              <div key={item.cartId} className="cart-row">
                <div>
                  <strong>{item.name}</strong>
                  {customLines.map((line) => (
                    <div key={line} className="muted small-text">{line}</div>
                  ))}
                </div>
                <div className="cart-row__actions">
                  <div className="qty-picker qty-picker--small">
                    <button onClick={() => onUpdateQty(item.cartId, Math.max(1, item.quantity - 1))}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => onUpdateQty(item.cartId, item.quantity + 1)}>+</button>
                  </div>
                  <strong>{formatCurrency(item.lineTotal)}</strong>
                  <button className="link-btn" onClick={() => onRemove(item.cartId)}>Remove</button>
                </div>
              </div>
            );
          })}

          <form className="checkout-form" onSubmit={handleSubmit}>
            <h3>Checkout</h3>
            {!hasSupabaseEnv && <div className="alert alert--warning">Supabase env is missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.</div>}
            {!user && <div className="alert alert--warning">Browse is open to everyone, but placing an order requires login.</div>}

            <div className="checkout-grid">
              <label>
                Name
                <input
                  value={checkoutForm.customerName}
                  onChange={(event) => setCheckoutForm((current) => ({ ...current, customerName: event.target.value }))}
                  placeholder={user?.fullName || 'Your name'}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={checkoutForm.customerEmail}
                  onChange={(event) => setCheckoutForm((current) => ({ ...current, customerEmail: event.target.value }))}
                  placeholder={user?.email || 'you@example.com'}
                />
              </label>
            </div>
            <div className="checkout-grid">
              <label>
                Order type
                <select
                  value={checkoutForm.orderType}
                  onChange={(event) => setCheckoutForm((current) => ({ ...current, orderType: event.target.value }))}
                >
                  <option value="pickup">Pickup</option>
                  <option value="dine_in">Dine in</option>
                  <option value="delivery">Delivery</option>
                </select>
              </label>
              <label>
                Time slot
                <select
                  value={checkoutForm.scheduledSlot}
                  onChange={(event) => setCheckoutForm((current) => ({ ...current, scheduledSlot: event.target.value }))}
                >
                  {checkoutForm.orderType === 'dine_in' ? <option value="">Walk-in / no reservation</option> : <option value="">ASAP / no slot</option>}
                  <option value="11:30 - 12:00">11:30 - 12:00</option>
                  <option value="12:00 - 12:30">12:00 - 12:30</option>
                  <option value="12:30 - 13:00">12:30 - 13:00</option>
                  <option value="18:00 - 18:30">18:00 - 18:30</option>
                  <option value="18:30 - 19:00">18:30 - 19:00</option>
                  <option value="19:00 - 19:30">19:00 - 19:30</option>
                </select>
              </label>
            </div>
            {checkoutForm.orderType === 'delivery' && (
              <>
                <label>
                  Delivery location
                  <input
                    value={checkoutForm.deliveryAddress}
                    onChange={(event) => setCheckoutForm((current) => ({ ...current, deliveryAddress: event.target.value }))}
                    placeholder="Room / building / street"
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={checkoutForm.priorityDelivery}
                    onChange={(event) => setCheckoutForm((current) => ({ ...current, priorityDelivery: event.target.checked }))}
                  />
                  Priority delivery +{formatCurrency(1200)}
                </label>
              </>
            )}
            <label>
              Coins to redeem
              <input
                type="number"
                min="0"
                step="100"
                max={maxRedeemableCoins}
                value={checkoutForm.coinsRedeemed}
                onChange={(event) => setCheckoutForm((current) => ({ ...current, coinsRedeemed: Number(event.target.value) || 0 }))}
              />
              <span className="muted small-text">100 coins = HK$1.00. Available now: {user?.loyaltyCoins || 0}</span>
            </label>
            <label>
              Order note
              <textarea
                rows="3"
                value={checkoutForm.notes}
                onChange={(event) => setCheckoutForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Delivery or whole-order note. This is separate from each meal note."
              />
            </label>

            <div className="totals-box">
              <div><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
              <div><span>Delivery fee</span><strong>{formatCurrency(deliveryFee)}</strong></div>
              <div><span>Coins redeemed</span><strong>- {formatCurrency(normalizedRedeem)}</strong></div>
              <div className="totals-box__grand"><span>Total</span><strong>{formatCurrency(total)}</strong></div>
            </div>

            <button className="primary-btn" disabled={!cartItems.length || !user || !hasSupabaseEnv}>Place order</button>
          </form>
        </div>
      </aside>
    </div>
  );
}
