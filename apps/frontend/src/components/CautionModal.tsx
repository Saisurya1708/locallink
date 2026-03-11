interface Props {
  onAccept: () => void;
  onClose: () => void;
}

export function CautionModal({ onAccept, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, border: '1px solid rgba(245,158,11,0.3)'
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 12 }}>
          Protect your privacy
        </h2>

        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          You're about to share personal information in this chat. Remember:
        </p>

        <ul style={{ color: 'var(--text-secondary)', paddingLeft: 20, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.6 }}>
          <li>Only share details you're comfortable with</li>
          <li>Never share passwords, banking info, or government IDs</li>
          <li>Trust your instincts — if something feels wrong, stop</li>
          <li>Check the other person's rating and reviews before meeting</li>
          <li>Meet in public places for in-person exchanges</li>
        </ul>

        <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 24 }}>
          <p style={{ color: 'var(--teal)', fontSize: 13 }}>
            🔒 Your messages are end-to-end encrypted. LocalLink staff cannot read your conversations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Go back
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onAccept}>
            I understand, continue
          </button>
        </div>
      </div>
    </div>
  );
}
