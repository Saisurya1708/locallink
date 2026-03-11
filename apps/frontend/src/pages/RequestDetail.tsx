import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useStore(s => s.user);

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [myInterest, setMyInterest] = useState<any>(null);
  const [interestMsg, setInterestMsg] = useState('');
  const [showInterestBox, setShowInterestBox] = useState(false);

  async function load() {
    try {
      const { data } = await api.get(`/requests/${id}`);
      setRequest(data);
      // Check if current user already expressed interest
      const mine = data.interests?.find((i: any) => i.userId === user?.id);
      setMyInterest(mine || null);
    } catch {
      setError('Request not found.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function expressInterest() {
    setActionLoading('interest');
    try {
      await api.post(`/requests/${id}/interest`, { message: interestMsg });
      setShowInterestBox(false);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed.');
    } finally {
      setActionLoading('');
    }
  }

  async function withdrawInterest() {
    setActionLoading('withdraw');
    try {
      await api.delete(`/requests/${id}/interest`);
      await load();
    } catch {}
    setActionLoading('');
  }

  async function acceptHelper(helperId: string) {
    setActionLoading('accept-' + helperId);
    try {
      await api.post(`/requests/${id}/accept/${helperId}`);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed.');
    } finally {
      setActionLoading('');
    }
  }

  async function doAction(action: string) {
    setActionLoading(action);
    try {
      await api.post(`/requests/${id}/${action}`);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Action failed.');
    } finally {
      setActionLoading('');
    }
  }

  if (loading) return <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
  if (error && !request) return <div className="page container" style={{ textAlign: 'center', paddingTop: 80 }}><p style={{ color: 'var(--red)' }}>{error}</p></div>;

  const isPoster = user?.id === request.posterId;
  const isHelper = user?.id === request.helperId;
  const chatUnlocked = ['IN_PROGRESS', 'COMPLETED'].includes(request.status) && (isPoster || isHelper);
  const pendingInterests = request.interests?.filter((i: any) => i.status === 'PENDING') || [];
  const myAccepted = myInterest?.status === 'ACCEPTED';
  const myRejected = myInterest?.status === 'REJECTED';

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>← Back</button>

        {/* Main card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 8 }}>{request.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                  Posted by <strong style={{ color: 'var(--accent)' }}>{request.displayName}</strong>
                </p>
                <span className={`badge badge-${request.status.toLowerCase().replace('_','-')}`}>
                  {STATUS_LABELS[request.status] || request.status}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ color: 'var(--accent)', fontSize: 13 }}>{'★'.repeat(Math.round(request.poster?.rating || 0))}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{request.poster?.rating?.toFixed(1) || '—'}</span>
            </div>
          </div>

          <div className="divider" />
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>{request.description}</p>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span>📁 {request.category?.replace('_', ' ')}</span>
            <span>🔵 {(request.radiusMeters / 1609.34).toFixed(1)} mi radius</span>
            <span>🕐 {new Date(request.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Chat button — shown prominently when unlocked */}
        {chatUnlocked && (
          <div className="card" style={{ marginBottom: 24, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: 'var(--teal)', fontWeight: 600, marginBottom: 4 }}>🔒 Encrypted chat is open</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  Chatting with <strong>{isPoster ? request.helper?.username : request.poster?.username}</strong>
                </p>
              </div>
              <Link to={`/chat/${id}`} className="btn btn-primary">
                Open chat →
              </Link>
            </div>
          </div>
        )}

        {/* Actions card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 20 }}>Actions</h2>
          {error && <p style={{ color: 'var(--red)', marginBottom: 16, fontSize: 13 }}>{error}</p>}

          {/* ── POSTER VIEW ── */}
          {isPoster && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Interested helpers list */}
              {request.status === 'OPEN' && (
                <>
                  {pendingInterests.length === 0 ? (
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        No one has expressed interest yet. Your request is visible to people within {(request.radiusMeters / 1609.34).toFixed(1)} miles.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                        {pendingInterests.length} {pendingInterests.length === 1 ? 'person has' : 'people have'} offered to help. Pick one to open an encrypted chat.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {pendingInterests.map((interest: any) => (
                          <div key={interest.id} style={{
                            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                            padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                          }}>
                            <div>
                              <p style={{ fontWeight: 600, marginBottom: 4 }}>
                                {interest.user.username}
                                <span style={{ color: 'var(--accent)', marginLeft: 8, fontSize: 13 }}>
                                  {'★'.repeat(Math.round(interest.user.rating || 0))} {interest.user.rating?.toFixed(1) || 'No ratings'}
                                </span>
                              </p>
                              {interest.message && (
                                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{interest.message}</p>
                              )}
                            </div>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => acceptHelper(interest.user.id)}
                              disabled={actionLoading === 'accept-' + interest.user.id}
                            >
                              {actionLoading === 'accept-' + interest.user.id ? '...' : '✓ Accept & open chat'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Complete / Cancel */}
              {request.status === 'IN_PROGRESS' && (
                <button className="btn btn-primary" onClick={() => doAction('complete')} disabled={actionLoading === 'complete'}>
                  {actionLoading === 'complete' ? '...' : '✓ Mark as completed'}
                </button>
              )}

              {['OPEN', 'IN_PROGRESS'].includes(request.status) && (
                <button className="btn btn-ghost btn-sm" onClick={() => doAction('cancel')} disabled={!!actionLoading}
                  style={{ color: 'var(--text-muted)', alignSelf: 'flex-start' }}>
                  Cancel request
                </button>
              )}
            </div>
          )}

          {/* ── HELPER VIEW ── */}
          {!isPoster && !isHelper && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {request.status !== 'OPEN' ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>This request is no longer accepting helpers.</p>
              ) : myRejected ? (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                  <p style={{ color: 'var(--red)', fontSize: 14 }}>The poster chose someone else for this request.</p>
                </div>
              ) : myInterest && !myRejected ? (
                <div>
                  <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 12 }}>
                    <p style={{ color: 'var(--accent)', fontSize: 14 }}>⏳ You've expressed interest. Waiting for the poster to respond...</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={withdrawInterest} disabled={actionLoading === 'withdraw'}
                    style={{ color: 'var(--text-muted)' }}>
                    Withdraw interest
                  </button>
                </div>
              ) : showInterestBox ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Optional message to poster</label>
                    <textarea className="input textarea" rows={3}
                      placeholder="Introduce yourself or explain why you can help..."
                      value={interestMsg} onChange={e => setInterestMsg(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => setShowInterestBox(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn btn-primary" onClick={expressInterest}
                      disabled={actionLoading === 'interest'} style={{ flex: 2 }}>
                      {actionLoading === 'interest' ? 'Sending...' : '🙋 Send interest'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                    Want to help? Express interest and the poster will review and may accept you. 
                    Chat only opens if the poster picks you.
                  </p>
                  <button className="btn btn-primary" onClick={() => setShowInterestBox(true)}>
                    🙋 I can help with this
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Helper who was accepted */}
          {isHelper && request.status === 'IN_PROGRESS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                <p style={{ color: 'var(--green)', fontSize: 14 }}>✓ You were accepted to help with this request!</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => doAction('cancel')} disabled={!!actionLoading}
                style={{ color: 'var(--text-muted)', alignSelf: 'flex-start' }}>
                Withdraw from request
              </button>
            </div>
          )}
        </div>

        {/* Helper info */}
        {request.helper && (
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, marginBottom: 12 }}>Helper</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                👤
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>{request.helper.username}</p>
                <p style={{ fontSize: 13, color: 'var(--accent)' }}>
                  {'★'.repeat(Math.round(request.helper.rating || 0))} {request.helper.rating?.toFixed(1) || 'No ratings yet'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
