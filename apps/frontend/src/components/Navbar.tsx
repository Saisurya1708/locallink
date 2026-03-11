import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

export function Navbar() {
  const { user, refreshToken, clearAuth } = useStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await api.delete('/auth/logout', { data: { refreshToken } }).catch(() => {});
    clearAuth();
    navigate('/');
  }

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link to={user ? '/feed' : '/'} className="nav-logo">
          Local<span>Link</span>
        </Link>

        {user ? (
          <div className="nav-links">
            <Link to="/feed" className="btn btn-ghost btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <span className="btn-text">Explore</span>
            </Link>
            <Link to="/post" className="btn btn-primary btn-sm">
              + Post Request
            </Link>
            <Link to="/profile" className="btn btn-ghost btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <span className="btn-text">{user.username}</span>
            </Link>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="nav-links">
            <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
