import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { api } from '../lib/api';
import { RequestCard } from '../components/RequestCard';

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

const CATEGORIES = ['ALL','GENERAL','ERRANDS','TECH_HELP','MOVING','FOOD','MEDICAL','EDUCATION','EMERGENCY','PETS','HOME_REPAIR'];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: 'badge-open', IN_PROGRESS: 'badge-approved', COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled',
  };
  const labels: Record<string, string> = {
    OPEN: 'Open', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  };
  return <span className={`badge ${map[status] || 'badge-open'}`}>{labels[status] || status}</span>;
}

export function Feed() {
  const { lat, lng, error: geoError, loading: geoLoading } = useGeolocation();
  const [tab, setTab] = useState<'explore' | 'my-posts' | 'helping'>('explore');
  const [requests, setRequests] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [helpingData, setHelpingData] = useState<{ helping: any[]; pending: any[] }>({ helping: [], pending: [] });
  const [radiusIdx, setRadiusIdx] = useState(3);
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const fetchNearby = useCallback(async () => {
    if (!lat || !lng) return;
    setLoading(true);
    try {
      const { data } = await api.get('/requests/nearby', { params: { lat, lng, radius: RADIUS_OPTIONS[radiusIdx].meters } });
      setRequests(data);
    } catch {}
    setLoading(false);
  }, [lat, lng, radiusIdx]);

  const fetchMyActivity = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, helpingRes] = await Promise.all([
        api.get('/profile/me/requests'),
        api.get('/profile/me/helping'),
      ]);
      setMyPosts(postsRes.data);
      setHelpingData(helpingRes.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'explore') fetchNearby();
    else fetchMyActivity();
  }, [tab, fetchNearby, fetchMyActivity]);

  const filtered = category === 'ALL' ? requests : requests.filter(r => r.category === category);

  if (geoLoading) return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div className="spinner" /><p style={{ color: 'var(--text-secondary)' }}>Getting your location...</p>
    </div>
  );

  return (
    <div className="page">
      <div className="container">
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {[
            { key: 'explore', label: '🔍 Explore' },
            { key: 'my-posts', label: '📋 My Posts' },
            { key: 'helping', label: '🤝 I\'m Helping' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '12px 16px',
                fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1, transition: 'all 0.2s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── EXPLORE TAB ── */}
        {tab === 'explore' && (
          <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 4 }}>Nearby Requests</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Within {RADIUS_OPTIONS[radiusIdx].label} of your location</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={fetchNearby} disabled={loading}>↻ Refresh</button>
                <Link to="/post" className="btn btn-primary btn-sm">+ Post Request</Link>
              </div>
            </div>

            {/* Radius slider */}
            <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Search Radius</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{RADIUS_OPTIONS[radiusIdx].label}</span>
              </div>
              <input type="range" min={0} max={RADIUS_OPTIONS.length - 1} value={radiusIdx} onChange={e => setRadiusIdx(Number(e.target.value))} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                <span>0.5 mi</span><span>500 mi</span>
              </div>
            </div>

            {/* Category filter */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} className="btn btn-sm"
                  style={{ background: category === cat ? 'var(--accent)' : 'var(--bg-elevated)', color: category === cat ? '#0a0c10' : 'var(--text-secondary)', border: `1px solid ${category === cat ? 'var(--accent)' : 'var(--border-strong)'}` }}>
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>No requests in this area yet</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Be the first to post, or expand your radius.</p>
                <Link to="/post" className="btn btn-primary">Post a request →</Link>
              </div>
            ) : (
              <div className="request-grid fade-in">
                {filtered.map(r => <RequestCard key={r.id} request={r} />)}
              </div>
            )}
          </>
        )}

        {/* ── MY POSTS TAB ── */}
        {tab === 'my-posts' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>My Posted Requests</h1>
              <Link to="/post" className="btn btn-primary btn-sm">+ New Request</Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
            ) : myPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>You haven't posted any requests yet.</p>
                <Link to="/post" className="btn btn-primary">Post your first request →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myPosts.map(r => (
                  <Link key={r.id} to={`/requests/${r.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="card card-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{r.title}</h3>
                          <StatusBadge status={r.status} />
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>{r.description.slice(0, 100)}{r.description.length > 100 ? '...' : ''}</p>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                          <span>📁 {r.category?.replace('_',' ')}</span>
                          <span>🔵 {(r.radiusMeters/1609.34).toFixed(1)} mi</span>
                          {r.interests?.length > 0 && <span style={{ color: 'var(--accent)' }}>🙋 {r.interests.filter((i:any) => i.status === 'PENDING').length} interested</span>}
                        </div>
                      </div>
                      {/* Chat button if active */}
                      {r.status === 'IN_PROGRESS' && r.helper && (
                        <Link to={`/chat/${r.id}`} className="btn btn-primary btn-sm" onClick={e => e.stopPropagation()}>
                          💬 Chat with {r.helper.username}
                        </Link>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── HELPING TAB ── */}
        {tab === 'helping' && (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 24 }}>Requests I'm Involved With</h1>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
            ) : (
              <>
                {/* Active helping */}
                {helpingData.helping.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 16, color: 'var(--green)' }}>✓ Actively Helping</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {helpingData.helping.map(r => (
                        <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{r.title}</h3>
                              <StatusBadge status={r.status} />
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                              Posted by <strong style={{ color: 'var(--accent)' }}>{r.poster?.username}</strong>
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            {r.status === 'IN_PROGRESS' && (
                              <Link to={`/chat/${r.id}`} className="btn btn-primary btn-sm">💬 Open Chat</Link>
                            )}
                            <Link to={`/requests/${r.id}`} className="btn btn-secondary btn-sm">View →</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending interests */}
                {helpingData.pending.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 16, color: 'var(--accent)' }}>⏳ Awaiting Response</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {helpingData.pending.map(r => (
                        <Link key={r.id} to={`/requests/${r.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="card card-hover">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{r.title}</h3>
                              <span className="badge badge-claimed">Pending</span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                              Posted by <strong style={{ color: 'var(--accent)' }}>{r.poster?.username}</strong> · Waiting for them to choose a helper
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {helpingData.helping.length === 0 && helpingData.pending.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🤝</div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>You haven't expressed interest in any requests yet.</p>
                    <button className="btn btn-primary" onClick={() => setTab('explore')}>Browse nearby requests →</button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
