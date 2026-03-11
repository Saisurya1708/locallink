import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useStore } from '../store/useStore';

const CATEGORIES = ['GENERAL','ERRANDS','TECH_HELP','MOVING','FOOD','MEDICAL','EDUCATION','EMERGENCY','PETS','HOME_REPAIR'];

const RADIUS_OPTIONS = [
  { label: '0.5 mi', meters: 800 },
  { label: '1 mi', meters: 1609 },
  { label: '2 mi', meters: 3218 },
  { label: '5 mi', meters: 8046 },
  { label: '10 mi', meters: 16093 },
  { label: '25 mi', meters: 40234 },
  { label: '50 mi', meters: 80467 },
  { label: '100 mi', meters: 160934 },
  { label: '250 mi', meters: 402336 },
  { label: '500 mi', meters: 804672 },
];

export function PostRequest() {
  const navigate = useNavigate();
  const user = useStore(s => s.user);
  const { lat, lng } = useGeolocation();

  const [form, setForm] = useState({
    displayName: user?.username || '',
    title: '',
    description: '',
    category: 'GENERAL',
    radiusIdx: 3,
    expiresAt: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lat || !lng) { setError('Location not available. Please enable location access.'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/requests', {
        displayName: form.displayName,
        title: form.title,
        description: form.description,
        category: form.category,
        lat,
        lng,
        radiusMeters: RADIUS_OPTIONS[form.radiusIdx].meters,
        expiresAt: form.expiresAt || undefined,
      });
      navigate(`/requests/${data.id}`);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to post request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, marginBottom: 8 }}>Post a request</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Only your chosen display name will be visible to others.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Anonymous display name */}
            <div className="input-group">
              <label className="input-label">Display name for this post</label>
              <input className="input" name="displayName" value={form.displayName} onChange={handleChange}
                placeholder="Anonymous, HelpfulNeighbor, etc." required maxLength={50} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                This is the only name others will see. Use anything — your username, a nickname, or "Anonymous".
              </span>
            </div>

            <div className="input-group">
              <label className="input-label">Title</label>
              <input className="input" name="title" value={form.title} onChange={handleChange}
                placeholder="Brief summary of what you need" required minLength={5} maxLength={120} />
            </div>

            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea className="input textarea" name="description" value={form.description} onChange={handleChange}
                placeholder="Describe your request in detail. What do you need? When? Any special requirements?"
                required minLength={10} maxLength={2000} rows={5} />
            </div>

            <div className="input-group">
              <label className="input-label">Category</label>
              <select className="input" name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>

            {/* Radius */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="input-label">Who can see this request</label>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                  Within {RADIUS_OPTIONS[form.radiusIdx].label}
                </span>
              </div>
              <input
                type="range" min={0} max={RADIUS_OPTIONS.length - 1}
                value={form.radiusIdx}
                onChange={e => setForm(f => ({ ...f, radiusIdx: Number(e.target.value) }))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>Hyper-local (0.5 mi)</span>
                <span>Wide area (500 mi)</span>
              </div>
            </div>

            {/* Optional expiry */}
            <div className="input-group">
              <label className="input-label">Expires at (optional)</label>
              <input className="input" type="datetime-local" name="expiresAt" value={form.expiresAt} onChange={handleChange} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Leave blank for no expiry</span>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/feed')} style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
                {loading ? 'Posting...' : 'Post request →'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
