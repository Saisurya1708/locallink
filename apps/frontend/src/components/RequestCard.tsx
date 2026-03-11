import { Link } from 'react-router-dom';

const CATEGORY_EMOJI: Record<string, string> = {
  GENERAL: '📌', ERRANDS: '🛒', TECH_HELP: '💻', MOVING: '📦',
  FOOD: '🍽️', MEDICAL: '🏥', EDUCATION: '📚', EMERGENCY: '🚨',
  PETS: '🐾', HOME_REPAIR: '🔧',
};

interface Props {
  request: {
    id: string;
    displayName: string;
    title: string;
    description: string;
    category: string;
    status: string;
    radiusMeters: number;
    distance_meters?: number;
    posterRating?: number;
    createdAt: string;
  };
}

function metersToMiles(m: number) {
  return (m / 1609.34).toFixed(1);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function RequestCard({ request }: Props) {
  const emoji = CATEGORY_EMOJI[request.category] || '📌';
  const statusClass = `badge badge-${request.status.toLowerCase()}`;

  return (
    <Link to={`/requests/${request.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card card-hover" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 24 }}>{emoji}</span>
            <div>
              <h3 style={{ fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 600, lineHeight: 1.3 }}>
                {request.title}
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                by <strong style={{ color: 'var(--accent)' }}>{request.displayName}</strong>
              </span>
            </div>
          </div>
          <span className={statusClass}>{request.status}</span>
        </div>

        {/* Description */}
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, flexGrow: 1,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {request.description}
        </p>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {request.distance_meters !== undefined && (
              <span>📍 {metersToMiles(request.distance_meters)} mi away</span>
            )}
            <span>🔵 {metersToMiles(request.radiusMeters)} mi radius</span>
          </div>
          <span>{timeAgo(request.createdAt)}</span>
        </div>

        {request.posterRating !== undefined && request.posterRating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)' }}>
            {'★'.repeat(Math.round(request.posterRating))}{'☆'.repeat(5 - Math.round(request.posterRating))}
            <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{request.posterRating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
