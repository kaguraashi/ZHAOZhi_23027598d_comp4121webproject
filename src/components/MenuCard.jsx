import { useState } from 'react';
import { formatCurrency } from '../lib/pricing.js';

const popularIds = new Set(['soy-chicken-rice', 'char-siu-rice', 'beef-brisket-noodle', 'build-your-own-bowl']);

export default function MenuCard({ item, onCustomize }) {
  const rawImage = item.image_url || item.imageUrl || '';
  const cook = item.cook_minutes || item.cookMinutes;
  const price = item.base_price || item.basePrice;
  const itemKey = item.id || item.slug;
  const isBuilder = itemKey === 'build-your-own-bowl' || item.category === 'Signature Builder';
  const popular = item.isPopular || popularIds.has(itemKey);
  const [imageError, setImageError] = useState(false);

  return (
    <article className="dish-card-web">
      <div className="dish-card-web__media">
        {!imageError && rawImage ? (
          <img src={rawImage} alt={item.name} className="dish-card-web__image" onError={() => setImageError(true)} />
        ) : (
          <div className="dish-card-web__image-fallback">
            <img src="/original-assets/icon.png" alt="Dishy" className="dish-card-web__image-fallback-logo" />
          </div>
        )}
        {isBuilder ? <div className="dish-card-web__badge">🥣 Build your own</div> : popular && <div className="dish-card-web__badge">🔥 Popular</div>}
      </div>
      <div className="dish-card-web__body">
        <div className="dish-card-web__topline">
          <div>
            <h3>{item.name}</h3>
            <div className="muted">{item.name_chinese || item.nameChinese}</div>
          </div>
          <div className="dish-card-web__time">⏰ {cook} min</div>
        </div>
        <p className="dish-card-web__desc">{item.description}</p>
        <div className="dish-card-web__footer">
          <div className="dish-card-web__price">From {formatCurrency(price)}</div>
          <button type="button" className="primary-btn" onClick={() => onCustomize(item)}>{isBuilder ? 'Build meal' : 'Customize order'}</button>
        </div>
      </div>
    </article>
  );
}
