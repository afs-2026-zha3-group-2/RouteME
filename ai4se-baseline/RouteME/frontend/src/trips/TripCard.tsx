import { Progress, Tag } from 'antd';
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

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function dayLabel(iso: string): string {
  if (iso === '') {
    return '日期待定';
  }
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '日期待定' : `${WEEKDAYS[date.getDay()]}出发`;
}

type Props = {
  trip: TripSummary;
  match?: Match;
  /** 紧凑行式卡片：用于「我的旅行」列表，封面缩成窄条，信息单行排布。 */
  compact?: boolean;
  /** 发布页实时预览：不跳详情、不打开资料弹窗。 */
  preview?: boolean;
};

export function TripCard({ trip, match, compact = false, preview = false }: Props) {
  const { openProfile } = useProfile();
  const joinedRate = trip.capacity === 0 ? 0 : Math.round((trip.joined_count / trip.capacity) * 100);
  const width = Math.min(100, Math.max(0, joinedRate));

  return (
    <article className={compact ? 'trip-card compact' : 'trip-card'}>
      {preview ? (
        <span className="tc-overlay" aria-hidden="true" />
      ) : (
        <a className="tc-overlay" href={`#/trips/${trip.id}`} aria-label={trip.title} />
      )}
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
          <span>{dayLabel(trip.start_date)}</span>
        </div>

        <p className="tc-route">
          <b>路线</b> {trip.stops.join(' → ')}
        </p>

        {trip.tags.length > 0 && (
          <div className="tc-tags">
            {trip.tags.map((tag) => (
              <Tag key={tag}>
                {tag}
              </Tag>
            ))}
          </div>
        )}

        {match !== undefined && (
          <div className="tc-match">
            <span className="match-ring">
              <Progress
                type="circle"
                percent={match.percentage}
                size={34}
                strokeWidth={10}
                strokeColor="var(--warn)"
                format={(percent) => percent}
              />
            </span>
            <span className="match-reason">{match.reasons.join('，')}</span>
          </div>
        )}

        <div className="tc-foot">
          {preview ? (
            <span className="tc-host">
              <Avatar user={trip.publisher} size="sm" />
              <span className="tc-host-name">{trip.publisher.nickname}</span>
            </span>
          ) : (
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
          )}
          <span className="tc-cap">
            <span className="tc-cap-num">
              {trip.joined_count} / {trip.capacity} {tripMessages.peopleUnit}
            </span>
            <span className={width >= 100 ? 'tc-meter is-full' : 'tc-meter'}>
              <Progress percent={width} size="small" showInfo={false} />
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}