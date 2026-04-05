import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';

const samplePrompt = 'I want a filling dinner for one person. Not too spicy, more protein, no mushroom, and keep the total under HK$90.';

export default function AiMealHelper({ open, onClose }) {
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
      setError('Please enter your request first.');
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
      setError(requestError.message || 'AI request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal--medium" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <p className="eyebrow">AI query</p>
            <h2>Quick meal suggestion</h2>
            <p className="muted">Describe what you want. The AI result is kept short so it does not take over the page.</p>
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
              placeholder="Tell us what you want to eat, your budget, and any dislikes."
            />
            <div className="ai-query-form__footer">
              <div className="muted small-text">{input.length}/700</div>
              <button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Loading...' : 'Get suggestion'}</button>
            </div>
          </form>

          {error && <div className="alert alert--error">{error}</div>}

          {result && (
            <div className="card card--nested ai-result-box">
              <h3>{result.recommendedDish || 'Suggested dish'}</h3>
              <p><strong>Summary:</strong> {result.summary || 'No summary returned.'}</p>
              {result.reason && <p><strong>Why:</strong> {result.reason}</p>}
              {result.kitchenNote && <p><strong>Kitchen note:</strong> {result.kitchenNote}</p>}
              {result.budgetTip && <p><strong>Budget tip:</strong> {result.budgetTip}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
