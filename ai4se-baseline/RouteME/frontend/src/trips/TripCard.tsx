import { cityLabel } from '../area/areaOptions';
import { tripMessages } from '../i18n/tripMessages';
import { useProfile } from '../profiles/ProfileContext';
import { publisherSummary } from '../profile/profileDisplay';
import { Avatar } from '../shell/Avatar';
import type { Match, TripSummary } from '../types';
import { StatusBadge } from './StatusBadge';

const COVER_TONES = ['lagoon', 'coral', 'jade', 'dusk', 'amber'] as const;

function coverTone(destination: string): string {
  let hash = 0;
  for (const char of destination) {
    hash = (hash + (char.codePointAt(0) ?? 0)) % 9973;
  }
  return COVER_TONES[hash % COVER_TONES.length];
}

function formatDate(iso: string): string {
  const [, month, day] = iso.split('-');
  if (month === undefined || day === undefined) {
    return iso;
  }
  return `${Number(month)}月${Number(day)}日`;
}

const RING_LENGTH = 94.25;

type Props = {
  trip: TripSummary;
  match?: Match;
  /** 紧凑行式卡片：用于「我的旅行」列表，封面缩成窄条，信息单行排布。 */
  compact?: boolean;
};

export function TripCard({ trip, match, compact = false }: Props) {
  const { openProfile } = useProfile();
  const joinedRate = trip.capacity === 0 ? 0 : Math.round((trip.joined_count / trip.capacity) * 100);
  const width = Math.min(100, Math.max(0, joinedRate));

  return (
    <article className={compact ? 'trip-card compact' : 'trip-card'}>
      <a className="tc-overlay" href={`#/trips/${trip.id}`} aria-label={trip.title} />
      <div className={`tc-cover cover-${coverTone(trip.destination_code)}`}>
        <span className="tc-dest">{cityLabel(trip.destination_code) || trip.destination}</span>
        <StatusBadge status={trip.status} />
      </div>

      <div className="tc-body">
        <h3 className="tc-title">{trip.title}</h3>

        <div className="tc-meta">
          <span>
            {formatDate(trip.start_date)} → {formatDate(trip.end_date)}
          </span>
          <span>{trip.stops.length} 个途经点</span>
        </div>

        <p className="tc-route">
          <b>路线</b> {trip.stops.join(' → ')}
        </p>

        {trip.tags.length > 0 && (
          <div className="tc-tags">
            {trip.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        {match !== undefined && (
          <div className="tc-match">
            <span className="match-ring" aria-hidden="true">
              <svg viewBox="0 0 34 34">
                <circle className="ring-bg" cx="17" cy="17" r="15" fill="none" strokeWidth="3" />
                <circle
                  className="ring-fg"
                  cx="17"
                  cy="17"
                  r="15"
                  fill="none"
                  strokeWidth="3"
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={RING_LENGTH * (1 - match.percentage / 100)}
                />
              </svg>
            </span>
            <span className="match-copy">
              <span className="match-score">
                {tripMessages.matchPercentage}{' '}
                <b className="match-percentage">{match.percentage}%</b>
              </span>
              <span className="match-reason">
                <span className="match-reason-label">{tripMessages.matchReasons}</span>
                {match.reasons.join('，')}
              </span>
            </span>
          </div>
        )}

        <div className="tc-foot">
          <button
            type="button"
            className="tc-host"
            aria-label={`查看 ${trip.publisher.nickname} 的资料`}
            onClick={() => openProfile(trip.publisher.id)}
          >
            <Avatar user={trip.publisher} size="sm" />
            <span className="tc-host-name">
              {trip.publisher.nickname}
              {publisherSummary(trip.publisher) !== '' &&
                ` · ${publisherSummary(trip.publisher)}`}
            </span>
          </button>
          <span className="tc-cap">
            <span className="tc-cap-num">
              {trip.joined_count} / {trip.capacity} {tripMessages.peopleUnit}
            </span>
            <span className={width >= 100 ? 'meter full' : 'meter'}>
              <i style={{ width: `${width}%` }} />
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}