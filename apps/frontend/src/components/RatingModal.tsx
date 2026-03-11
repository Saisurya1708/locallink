import { useState } from 'react';
import { api } from '../lib/api';

interface Props {
  requestId: string;
  rateeUsername: string;
  onDone: () => void;
}

export function RatingModal({ requestId, rateeUsername, onDone }: Props) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (stars === 0) { setError('Please select a star rating.'); return; }
    setLoading(true);
    try {
      await api.post('/ratings', { requestId, stars, comment: comment || undefined });
      onDone();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to submit rating.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>
          Rate {rateeUsername}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          How was your experience? Your rating helps the community build trust.
        </p>

        {/* Star selector */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setStars(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                fontSize: 36, color: n <= (hover || stars) ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'color 0.15s, transform 0.15s',
                transform: n <= (hover || stars) ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              ★
            </button>
          ))}
        </div>

        <div className="input-group" style={{ marginBottom: 20 }}>
          <label className="input-label">Comment (optional)</label>
          <textarea
            className="input textarea"
            placeholder="Share a bit about your experience..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
          />
        </div>

        {error && <p style={{ color: 'var(--red)', marginBottom: 16, fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onDone}>Skip</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}
