import { useMemo, useState } from 'react';
import MenuCard from '../components/MenuCard.jsx';
import AiMealHelper from '../components/AiMealHelper.jsx';

const mealTimeOptions = [
  { id: 'all', label: 'All day', time: 'Full menu', emoji: '🍽️' },
  { id: 'breakfast', label: 'Breakfast', time: '7-11 AM', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', time: '11 AM-2 PM', emoji: '☀️' },
  { id: 'dinner', label: 'Dinner', time: '6-9 PM', emoji: '🌆' },
  { id: 'supper', label: 'Supper', time: '9 PM-1 AM', emoji: '🌙' },
];

const mealTimeCategories = {
  all: null,
  breakfast: new Set(['Congee', 'Drinks']),
  lunch: new Set(['Rice Plates', 'Noodles', 'Drinks', 'Signature Builder']),
  dinner: new Set(['Rice Plates', 'Noodles', 'Drinks', 'Signature Builder']),
  supper: new Set(['Congee', 'Noodles', 'Drinks']),
};

function detectDefaultMealTime() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 18 && hour < 21) return 'dinner';
  if (hour >= 21 || hour < 1) return 'supper';
  return 'all';
}

export default function HomePage({ menuItems, onCustomize }) {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [mealTime, setMealTime] = useState(detectDefaultMealTime());
  const [aiOpen, setAiOpen] = useState(false);

  const builderItem = useMemo(
    () => menuItems.find((item) => (item.id || item.slug) === 'build-your-own-bowl' || item.category === 'Signature Builder') || null,
    [menuItems]
  );

  const regularItems = useMemo(
    () => menuItems.filter((item) => (item.id || item.slug) !== 'build-your-own-bowl' && item.category !== 'Signature Builder'),
    [menuItems]
  );

  const categories = useMemo(() => ['All', ...new Set(regularItems.map((item) => item.category).filter(Boolean))], [regularItems]);
  const availableCategories = mealTimeCategories[mealTime];

  const filteredRegularItems = useMemo(
    () =>
      regularItems.filter((item) => {
        const categoryName = item.category || '';
        const matchCategory = category === 'All' || categoryName === category;
        const matchMealTime = !availableCategories || availableCategories.has(categoryName);
        const keyword = `${item.name} ${item.name_chinese || item.nameChinese || ''} ${item.description || ''}`.toLowerCase();
        const matchSearch = keyword.includes(search.toLowerCase());
        return matchCategory && matchSearch && matchMealTime;
      }),
    [regularItems, category, search, availableCategories]
  );

  const showBuilder = Boolean(
    builderItem &&
      (mealTime === 'all' || mealTime === 'lunch' || mealTime === 'dinner') &&
      (`${builderItem.name} ${builderItem.description || ''}`.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-shell shell desktop-home">
      <section className="desktop-home__hero desktop-home__hero--single">
        <article className="card hero-panel hero-panel--brand">
          <div className="hero-brandline">
            <img src="/original-assets/icon.png" alt="HK Home Dishes" className="hero-brandline__logo" />
            <div>
              <div className="hero-brandline__title">HK Home Dishes</div>
              <div className="muted">家常風味</div>
            </div>
          </div>
          <h1>Regular dishes when you want speed. Build-your-own when you want more control.</h1>
          <p className="muted hero-panel__copy">
            Start with a standard meal or customize your own bowl with different bases, proteins, sauces, sides, and notes.
          </p>

          <div className="hero-search-row">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dishes or ingredients" />
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((entry) => (
                <option key={entry} value={entry}>{entry}</option>
              ))}
            </select>
          </div>

          <div className="meal-presets-card">
            <div className="meal-presets-card__header">
              <div>
                <h3>Order time</h3>
                <p className="muted small-text">Use this to filter dishes for breakfast, lunch, dinner, or supper.</p>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setAiOpen(true)}>Need a quick suggestion?</button>
            </div>
            <div className="meal-presets-grid meal-presets-grid--five">
              {mealTimeOptions.map((meal) => (
                <button
                  type="button"
                  key={meal.id}
                  className={`meal-preset ${mealTime === meal.id ? 'meal-preset--active' : ''}`}
                  onClick={() => setMealTime(meal.id)}
                >
                  <span className="meal-preset__emoji">{meal.emoji}</span>
                  <strong>{meal.label}</strong>
                  <span>{meal.time}</span>
                </button>
              ))}
            </div>
          </div>
        </article>
      </section>

      {showBuilder && (
        <section className="menu-section-web">
          <div className="section-heading section-heading--tight">
            <div>
              <p className="eyebrow">Custom meal</p>
              <h2>Build your own bowl</h2>
              <p className="muted small-text">Choose base, protein, sauce, spice, extras, and special notes in one order flow.</p>
            </div>
          </div>
          <div className="builder-feature-grid">
            <div className="builder-feature-copy card card--nested">
              <h3>{builderItem.name}</h3>
              <p className="muted">{builderItem.description}</p>
              <ul className="feature-list">
                <li>Mix your own combination instead of ordering a fixed set.</li>
                <li>Adjust ingredients and extras to fit your taste or budget.</li>
                <li>Leave notes for the kitchen in the same flow.</li>
              </ul>
              <button type="button" className="primary-btn" onClick={() => onCustomize(builderItem)}>Build your meal</button>
            </div>
            <MenuCard item={builderItem} onCustomize={onCustomize} />
          </div>
        </section>
      )}

      <section className="menu-section-web">
        <div className="section-heading section-heading--tight">
          <div>
            <p className="eyebrow">Regular menu</p>
            <h2>{category === 'All' ? 'Regular dishes' : category}</h2>
            <p className="muted small-text">
              These are standard dishes for quick ordering. Use customize on each card if you want small adjustments.
            </p>
          </div>
        </div>
        {!filteredRegularItems.length ? (
          <div className="card empty-box">No regular dishes match your search or selected time.</div>
        ) : (
          <div className="menu-grid-desktop">
            {filteredRegularItems.map((item) => (
              <MenuCard key={item.id || item.slug} item={item} onCustomize={onCustomize} />
            ))}
          </div>
        )}
      </section>

      <AiMealHelper open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
