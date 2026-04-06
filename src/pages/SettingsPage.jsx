import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const STORAGE_KEY = 'dishy-settings-draft';

const defaultState = {
  destination: 'Office',
  building: '',
  floor: '',
  lunchReminder: true,
  mainGoal: 'Balanced',
  targetCalories: '650',
  targetProtein: '30',
  avoidIngredients: '',
  allergies: '',
  lowSugar: false,
  lowSodium: false,
  noFried: false,
  favouriteKitchen: 'HK Home Dishes',
  supportChannel: 'Email',
};

function SoonCard({ title, detail }) {
  return (
    <div className="settings-panel settings-panel--soon">
      <div>
        <strong>{title}</strong>
        <div className="muted small-text">{detail}</div>
      </div>
      <span className="soon-tag">Available soon</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState('');
  const [form, setForm] = useState(defaultState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setForm({ ...defaultState, ...JSON.parse(raw) });
    } catch {}
  }, []);

  if (!user) {
    return (
      <div className="page-shell shell gated-page">
        <section className="card gated-card">
          <p className="eyebrow">Settings</p>
          <h1>Sign in to manage delivery, health, and account preferences.</h1>
          <p className="muted">You can keep browsing as a guest and sign in later.</p>
          <div className="gated-actions">
            <Link className="primary-btn" to="/auth">Sign in</Link>
            <Link className="ghost-btn" to="/">Back to menu</Link>
          </div>
        </section>
      </div>
    );
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setSaved('Saved on this device.');
    setTimeout(() => setSaved(''), 2500);
  }

  return (
    <div className="page-shell shell settings-layout">
      <section className="card settings-main">
        <div className="section-heading section-heading--tight">
          <div>
            <p className="eyebrow">Settings</p>
            <h1>Account, delivery, and health preferences</h1>
          </div>
        </div>

        <div className="settings-section">
          <h3>Security</h3>
          <div className="settings-grid">
            <SoonCard title="Change password" detail="Update your sign-in password." />
            <SoonCard title="MFA" detail="Add another layer of sign-in security." />
            <SoonCard title="Trusted devices" detail="Review devices used on your account." />
            <SoonCard title="Login alerts" detail="Get notified about unusual sign-ins." />
          </div>
        </div>

        <div className="settings-section">
          <h3>Delivery preferences</h3>
          <div className="checkout-grid">
            <label>
              <span>Default destination</span>
              <select value={form.destination} onChange={(event) => updateField('destination', event.target.value)}>
                <option>Office</option>
                <option>Home</option>
                <option>Gym</option>
              </select>
            </label>
            <label>
              <span>Building or company</span>
              <input value={form.building} onChange={(event) => updateField('building', event.target.value)} placeholder="Central Plaza" />
            </label>
            <label>
              <span>Floor or desk note</span>
              <input value={form.floor} onChange={(event) => updateField('floor', event.target.value)} placeholder="12/F reception" />
            </label>
            <label>
              <span>Favourite kitchen</span>
              <select value={form.favouriteKitchen} onChange={(event) => updateField('favouriteKitchen', event.target.value)}>
                <option>HK Home Dishes</option>
                <option>Morning Kitchen</option>
                <option>Central Noodle House</option>
                <option>Fit Bowl Lab</option>
              </select>
            </label>
            <label className="switch-row switch-row--boxed">
              <input type="checkbox" checked={form.lunchReminder} onChange={(event) => updateField('lunchReminder', event.target.checked)} />
              <span>Lunch reminder</span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Health management</h3>
          <div className="checkout-grid">
            <label>
              <span>Main goal</span>
              <select value={form.mainGoal} onChange={(event) => updateField('mainGoal', event.target.value)}>
                <option>Balanced</option>
                <option>High protein</option>
                <option>Lighter meals</option>
                <option>Office lunch</option>
                <option>Comfort</option>
              </select>
            </label>
            <label>
              <span>Target kcal / meal</span>
              <input value={form.targetCalories} onChange={(event) => updateField('targetCalories', event.target.value)} placeholder="650" />
            </label>
            <label>
              <span>Target protein / meal</span>
              <input value={form.targetProtein} onChange={(event) => updateField('targetProtein', event.target.value)} placeholder="30" />
            </label>
            <label>
              <span>Avoid ingredients</span>
              <input value={form.avoidIngredients} onChange={(event) => updateField('avoidIngredients', event.target.value)} placeholder="Onion, coriander" />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span>Allergies or strict rules</span>
              <textarea className="textarea" rows="3" value={form.allergies} onChange={(event) => updateField('allergies', event.target.value)} placeholder="Shellfish allergy, no peanuts" />
            </label>
            <label className="switch-row switch-row--boxed">
              <input type="checkbox" checked={form.lowSugar} onChange={(event) => updateField('lowSugar', event.target.checked)} />
              <span>Prefer lower sugar</span>
            </label>
            <label className="switch-row switch-row--boxed">
              <input type="checkbox" checked={form.lowSodium} onChange={(event) => updateField('lowSodium', event.target.checked)} />
              <span>Prefer lower sodium</span>
            </label>
            <label className="switch-row switch-row--boxed">
              <input type="checkbox" checked={form.noFried} onChange={(event) => updateField('noFried', event.target.checked)} />
              <span>Reduce fried items</span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Support</h3>
          <div className="checkout-grid">
            <label>
              <span>Preferred support channel</span>
              <select value={form.supportChannel} onChange={(event) => updateField('supportChannel', event.target.value)}>
                <option>Email</option>
                <option>Phone</option>
                <option>In-app message</option>
              </select>
            </label>
          </div>
          <div className="settings-grid" style={{ marginTop: 12 }}>
            <SoonCard title="Contact us" detail="General customer support." />
            <SoonCard title="Order issue help" detail="Late, missing, or wrong order support." />
            <SoonCard title="Refund support" detail="Support for refund requests." />
            <SoonCard title="Merchant contact" detail="Talk to the restaurant team." />
          </div>
        </div>

        <div className="settings-section">
          <h3>More for later</h3>
          <div className="settings-grid">
            <SoonCard title="Weekly meal plan" detail="Plan your workweek meals." />
            <SoonCard title="Favourite kitchens" detail="Pin kitchens you order from often." />
            <SoonCard title="Saved lunch routine" detail="Reuse your usual lunch setup." />
            <SoonCard title="Receipt reminders" detail="Receive a work expense reminder after lunch." />
          </div>
        </div>

        <div className="settings-actions">
          <button type="button" className="primary-btn" onClick={handleSave}>Save changes</button>
          {saved && <span className="muted small-text">{saved}</span>}
        </div>
      </section>
    </div>
  );
}
