import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';

export function Landing() {
  const user = useStore(s => s.user);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <section style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(245,158,11,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 760 }}>
          <div className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', marginBottom: 28, fontSize: 12 }}>
            🔐 Privacy-first · E2E Encrypted · Anonymous
          </div>

          <h1 style={{ fontSize: 'clamp(42px, 7vw, 80px)', fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1.08, marginBottom: 24 }}>
            Get help from<br />
            <span style={{ color: 'var(--accent)' }}>people nearby.</span><br />
            No strings attached.
          </h1>

          <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
            Post a request, stay anonymous, connect with trusted locals — 
            all within a radius you control. Your identity, your choice.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <Link to="/feed" className="btn btn-primary btn-lg">Browse Requests →</Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">Start anonymously →</Link>
                <Link to="/login" className="btn btn-secondary btn-lg">Sign in</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <h2 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', fontSize: 36, marginBottom: 56 }}>
            How LocalLink works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {[
              { icon: '🎭', title: 'Stay anonymous', desc: 'Post with any display name. Your real identity — name, email, phone — is encrypted and never shared.' },
              { icon: '📍', title: 'Control your radius', desc: 'Set your request to reach 0.5 mi or 500 mi. Only people in that zone can see and respond.' },
              { icon: '🔒', title: 'E2E encrypted chat', desc: 'Messages are encrypted on your device. Even LocalLink cannot read your conversations.' },
              { icon: '⭐', title: 'Trust through ratings', desc: 'Rate every completed request. Build a reputation. See who\'s reliable before connecting.' },
            ].map(f => (
              <div key={f.title} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, marginBottom: 16 }}>
            Ready to find help near you?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Free forever. No ads. No data selling.</p>
          <Link to="/register" className="btn btn-primary btn-lg">Create your profile →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        © {new Date().getFullYear()} LocalLink. Privacy-first local help network.
      </footer>
    </div>
  );
}
