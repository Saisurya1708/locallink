import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { generateKeyPair } from '../crypto/e2ee';
import { useStore } from '../store/useStore';

export function Register() {
  const navigate = useNavigate();
  const setAuth = useStore(s => s.setAuth);
  const setLocation = useStore(s => s.setLocation);

  const [form, setForm] = useState({
    username: '', realName: '', email: '', phone: '', password: '', confirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'location'>('form');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function requestLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation not supported. Please use a modern browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocation(pos.coords.latitude, pos.coords.longitude);
        setStep('location');
      },
      err => setError(`Location error: ${err.message}. Location is required to find nearby requests.`)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (!coords) { setError('Location is required.'); return; }

    setLoading(true);
    try {
      // Generate ECDH key pair — private key stored in IndexedDB only
      const { publicKeyB64 } = await generateKeyPair();

      const { data } = await api.post('/auth/register', {
        username: form.username,
        realName: form.realName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        publicKey: publicKeyB64,
        lat: coords.lat,
        lng: coords.lng,
      });

      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/feed');
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.errors?.[0]?.msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 10 }}>
            Create your profile
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Your real info stays private. Only you can see it.
          </p>
        </div>

        {/* Privacy notice */}
        <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: 'var(--accent)', lineHeight: 1.6 }}>
            🔐 Your name, email, and phone are encrypted at rest and never shared with other users. 
            They serve only as your login credentials.
          </p>
        </div>

        <form onSubmit={step === 'form' ? (e) => { e.preventDefault(); requestLocation(); } : handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div className="input-group">
              <label className="input-label">Username (public)</label>
              <input className="input" name="username" value={form.username} onChange={handleChange}
                placeholder="Your public handle" required minLength={2} maxLength={30} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>This is what others see on your posts</span>
            </div>

            <div className="input-group">
              <label className="input-label">Real name (private)</label>
              <input className="input" name="realName" value={form.realName} onChange={handleChange}
                placeholder="Your full name" required />
            </div>

            <div className="input-group">
              <label className="input-label">Email (private)</label>
              <input className="input" type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" required />
            </div>

            <div className="input-group">
              <label className="input-label">Phone number (private)</label>
              <input className="input" type="tel" name="phone" value={form.phone} onChange={handleChange}
                placeholder="+1 555 000 0000" required />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input className="input" type="password" name="password" value={form.password} onChange={handleChange}
                placeholder="Min 8 characters" required minLength={8} />
            </div>

            <div className="input-group">
              <label className="input-label">Confirm password</label>
              <input className="input" type="password" name="confirm" value={form.confirm} onChange={handleChange}
                placeholder="Repeat your password" required />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>
              </div>
            )}

            {step === 'form' ? (
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>
                Next — allow location →
              </button>
            ) : (
              <>
                {coords && (
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                    <p style={{ color: 'var(--green)', fontSize: 13 }}>
                      ✓ Location set: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                    </p>
                  </div>
                )}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
                  {loading ? 'Creating your profile...' : 'Create profile →'}
                </button>
              </>
            )}

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
