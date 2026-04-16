import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';

const samplePrompt = 'High protein lunch under HK$90. No mushroom.';

export default function AiMealHelper({ open, onClose, onUseRecommended }) {
  const [input, setInput] = useState(samplePrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) {
      setError('');
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt) {
      setError('Enter a request first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('/api/ai-meal-helper', {
        method: 'POST',
        body: { prompt },
      });
      setResult(data.result || null);
    } catch (requestError) {
      setError(requestError.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  function handleUseRecommended() {
    if (!result || result.recommendationType !== 'community_preset' || !result.presetCustomization) return;
    onUseRecommended?.(result);
    onClose?.();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal--medium" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <p className="eyebrow">AI query</p>
            <h2>Quick suggestion</h2>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose}>Close</button>
        </div>

        <div className="modal__content">
          <form className="ai-query-form" onSubmit={handleSubmit}>
            <textarea
              className="textarea"
              rows="4"
              maxLength="700"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Goal, budget, dislikes..."
            />
            <div className="ai-query-form__footer">
              <div className="muted small-text">{input.length}/700</div>
              <button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Loading...' : 'Get suggestion'}</button>
            </div>
          </form>

          {error && <div className="alert alert--error">{error}</div>}

          {result && (
            <div className="card card--nested ai-result-box">
              <div className="compact-row compact-row--top">
                <h3>{result.recommendedDish || 'Suggested dish'}</h3>
                <span className="status-badge status-badge--ready">
                  {result.recommendationType === 'community_preset' ? 'Community saved bowl' : 'Regular menu'}
                </span>
              </div>
              <p><strong>Summary:</strong> {result.summary || 'No summary returned.'}</p>
              {result.reason && <p><strong>Why:</strong> {result.reason}</p>}
              {result.kitchenNote && <p><strong>Note:</strong> {result.kitchenNote}</p>}
              {result.budgetTip && <p><strong>Budget:</strong> {result.budgetTip}</p>}
              {result.recommendationType === 'community_preset' && (
                <div className="builder-feature-actions">
                  <button type="button" className="primary-btn" onClick={handleUseRecommended}>Use this saved bowl</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
