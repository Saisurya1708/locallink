import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { getSocket } from '../hooks/useSocket';
import { deriveSharedKey, encryptMessage, decryptMessage } from '../crypto/e2ee';
import { CautionModal } from '../components/CautionModal';
import { RatingModal } from '../components/RatingModal';

interface DecryptedMsg {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export function Chat() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const user = useStore(s => s.user);

  const [request, setRequest] = useState<any>(null);
  const [messages, setMessages] = useState<DecryptedMsg[]>([]);
  const [input, setInput] = useState('');
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [showCaution, setShowCaution] = useState(false);
  const [cautionAccepted, setCautionAccepted] = useState(() => !!localStorage.getItem('caution-accepted'));
  const [showRating, setShowRating] = useState(false);
  const [rateeInfo, setRateeInfo] = useState<{ id: string; username: string } | null>(null);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  // Setup: load request, derive key, load history
  useEffect(() => {
    async function setup() {
      try {
        // Load request details
        const { data: req } = await api.get(`/requests/${requestId}`);
        setRequest(req);

        // Get both participants' public keys
        const { data: keys } = await api.get(`/chat/${requestId}/keys`);

        const myId = user?.id;
        const otherKey = keys.poster?.id === myId ? keys.helper?.publicKey : keys.poster?.publicKey;
        const otherUser = keys.poster?.id === myId ? keys.helper : keys.poster;

        if (!otherKey) { setError('Could not find the other participant.'); setLoading(false); return; }

        // Derive shared AES key from ECDH
        const key = await deriveSharedKey(otherKey);
        setSharedKey(key);
        setRateeInfo(otherUser);

        // Load message history
        const { data: msgs } = await api.get(`/chat/${requestId}/messages`);

        const decrypted = await Promise.all(
          msgs.map(async (m: any) => {
            try {
              const text = await decryptMessage(m.iv, m.ciphertext, key);
              return { id: m.id, senderId: m.senderId, text, createdAt: m.createdAt };
            } catch {
              return { id: m.id, senderId: m.senderId, text: '[Encrypted message — decryption failed]', createdAt: m.createdAt };
            }
          })
        );
        setMessages(decrypted);
      } catch (e: any) {
        setError(e.response?.data?.error || 'Could not open chat. Ensure the request is approved.');
      } finally {
        setLoading(false);
      }
    }
    setup();
  }, [requestId, user?.id]);

  // Socket: join room + listen for messages
  useEffect(() => {
    if (!sharedKey || !requestId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join_chat', { requestId });

    socket.on('message', async ({ id, senderId, iv, ciphertext, createdAt }: any) => {
      try {
        const text = await decryptMessage(iv, ciphertext, sharedKey);
        setMessages(prev => [...prev, { id, senderId, text, createdAt }]);
      } catch {
        setMessages(prev => [...prev, { id, senderId, text: '[Encrypted message]', createdAt }]);
      }
    });

    socket.on('typing', ({ senderId }: any) => {
      if (senderId !== user?.id) {
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 2000);
      }
    });

    return () => {
      socket.off('message');
      socket.off('typing');
    };
  }, [sharedKey, requestId, user?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Check if should show rating modal
  useEffect(() => {
    if (request?.status === 'COMPLETED' && rateeInfo) {
      setShowRating(true);
    }
  }, [request?.status, rateeInfo]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !sharedKey) return;

    // Show caution modal on first send
    if (!cautionAccepted) {
      setShowCaution(true);
      return;
    }

    const text = input.trim();
    setInput('');

    try {
      const { iv, ciphertext } = await encryptMessage(text, sharedKey);
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('message', { requestId, iv, ciphertext });
      } else {
        // REST fallback
        await api.post(`/chat/${requestId}/messages`, { iv, ciphertext });
        // Optimistic add
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          senderId: user?.id || '',
          text,
          createdAt: new Date().toISOString(),
        }]);
      }
    } catch {
      setError('Failed to send message. Please try again.');
    }
  }, [input, sharedKey, cautionAccepted, requestId, user?.id]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Emit typing event
    const socket = getSocket();
    socket?.emit('typing', { requestId });
  }

  if (loading) return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="spinner" />
    </div>
  );

  if (error) return (
    <div className="page container" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 12 }}>Chat unavailable</h2>
      <p style={{ color: 'var(--red)', marginBottom: 24 }}>{error}</p>
      <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Go back</button>
    </div>
  );

  const otherUsername = rateeInfo?.username || 'Other user';

  return (
    <div style={{ height: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>
      {/* Caution modal */}
      {showCaution && (
        <CautionModal
          onAccept={() => {
            setCautionAccepted(true);
            localStorage.setItem('caution-accepted', '1');
            setShowCaution(false);
            handleSend();
          }}
          onClose={() => setShowCaution(false)}
        />
      )}

      {/* Rating modal */}
      {showRating && rateeInfo && (
        <RatingModal
          requestId={requestId!}
          rateeUsername={otherUsername}
          onDone={() => setShowRating(false)}
        />
      )}

      {/* Chat header */}
      <div style={{
        padding: '16px 24px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, fontFamily: 'var(--font-display)' }}>{otherUsername}</p>
          <p style={{ fontSize: 11, color: 'var(--teal)' }}>🔒 End-to-end encrypted · {request?.title}</p>
        </div>
        <span className={`badge badge-${request?.status?.toLowerCase()}`}>{request?.status}</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <p>This chat is end-to-end encrypted.</p>
            <p>Only you and {otherUsername} can read these messages.</p>
          </div>
        )}

        {messages.map(msg => {
          const isMine = msg.senderId === user?.id;
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
              <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                {msg.text}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, padding: '0 4px' }}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {typing && (
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div className="chat-bubble theirs" style={{ padding: '10px 16px' }}>
              <span style={{ letterSpacing: 3 }}>···</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {['APPROVED', 'IN_PROGRESS'].includes(request?.status) ? (
        <div style={{ padding: '16px 24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
          <textarea
            className="input"
            style={{ resize: 'none', minHeight: 'unset', height: 48, paddingTop: 12 }}
            placeholder="Type a message... (Enter to send)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!input.trim()}
            style={{ flexShrink: 0 }}
          >
            Send
          </button>
        </div>
      ) : (
        <div style={{ padding: '16px 24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {request?.status === 'COMPLETED' ? 'This request has been completed.' : 'Chat is read-only.'}
          </p>
        </div>
      )}
    </div>
  );
}
