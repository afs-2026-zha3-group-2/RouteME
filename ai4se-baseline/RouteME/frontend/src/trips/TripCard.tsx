import { Progress, Tag } from 'antd';
import { cityLabel } from '../area/areaOptions';
import { tripMessages } from '../i18n/tripMessages';
import { useProfile } from '../profiles/ProfileContext';
import { publisherSummary } from '../profile/profileDisplay';
import { creditLine, creditRestrictedBadge, creditTone } from '../profile/creditDisplay';
import { Avatar } from '../shell/Avatar';
import type { Match, TripSummary, UserCreditEntry } from '../types';
import { coverTone } from './coverTone';
import { StatusBadge } from './StatusBadge';
import { formatMonthDay, weekdayLabel } from './tripDateFormat';

function dayLabel(iso: string): string {
  return iso === '' ? '日期待定' : `${weekdayLabel(iso)}出发`;
}

type Props = {
  trip: TripSummary;
  match?: Match;
  /** 发布者信用状态；由页面层一次取数后下发，缺失时不展示。 */
  credit?: UserCreditEntry;
  /** 发布页实时预览：不跳详情、不打开资料弹窗。 */
  preview?: boolean;
};

export function TripCard({ trip, match, credit, preview = false }: Props) {
  const { openProfile } = useProfile();
  const joinedRate = trip.capacity === 0 ? 0 : Math.round((trip.joined_count / trip.capacity) * 100);
  const width = Math.min(100, Math.max(0, joinedRate));

  return (
    <article className="trip-card">
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
            {formatMonthDay(trip.start_date)} → {formatMonthDay(trip.end_date)}
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
              {credit !== undefined && (
                <span className={`profile-credit is-compact tc-credit ${creditTone(credit.credit_level)}`}>
                  {creditLine(credit.credit_score, credit.credit_level)}
                  {credit.credit_restricted && (
                    <span className="badge danger credit-restricted-badge">
                      {creditRestrictedBadge(credit.credit_restricted)}
                    </span>
                  )}
                </span>
              )}
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