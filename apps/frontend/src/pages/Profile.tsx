import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';

export function Profile() {
  const user = useStore(s => s.user);
  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: p }, { data: r }] = await Promise.all([
          api.get('/profile/me'),
          api.get(`/ratings/user/${user?.id}`),
        ]);
        setProfile(p);
        setRatings(r.reviews || []);
      } catch {}
      setLoading(false);
    }
    load();
  }, [user?.id]);

  if (loading) return <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 680 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 32 }}>Your Profile</h1>

        {/* Identity card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
              👤
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{profile?.username}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ color: 'var(--accent)', fontSize: 16 }}>
                  {'★'.repeat(Math.round(profile?.rating || 0))}{'☆'.repeat(5 - Math.round(profile?.rating || 0))}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                  {profile?.rating?.toFixed(1) || '0.0'} ({profile?.ratingCount || 0} ratings)
                </span>
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* Private PII — only visible to owner */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Real Name (private)</p>
              <p style={{ fontSize: 15 }}>{profile?.realName || '—'}</p>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Email (private)</p>
              <p style={{ fontSize: 15 }}>{profile?.email || '—'}</p>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Phone (private)</p>
              <p style={{ fontSize: 15 }}>{profile?.phone || '—'}</p>
            </div>
          </div>

          <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            🔐 This information is encrypted and never visible to other users.
          </p>
        </div>

        {/* Ratings */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 20 }}>Reviews received</h2>
          {ratings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No reviews yet. Complete requests to earn ratings.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {ratings.map(r => (
                <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ color: 'var(--accent)' }}>{'★'.repeat(r.stars)}{'☆'.repeat(5-r.stars)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>from {r.rater.username}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.comment && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick link */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/post" className="btn btn-primary">+ Post a request</Link>
          <Link to="/feed" className="btn btn-secondary">Browse requests</Link>
        </div>
      </div>
    </div>
  );
}
