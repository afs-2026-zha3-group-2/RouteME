import { Progress, Tag } from 'antd';
import { cityLabel } from '../area/areaOptions';
import { GrowthBadge } from '../growth/GrowthBadge';
import { tripMessages } from '../i18n/tripMessages';
import { useProfile } from '../profiles/ProfileContext';
import { publisherSummary } from '../profile/profileDisplay';
import { creditLine, creditRestrictedBadge, creditTone } from '../profile/creditDisplay';
import { Avatar } from '../shell/Avatar';
import type { TripSummary, UserCreditEntry, UserGrowthEntry } from '../types';
import { cityPhoto } from './cityPhotos';
import { coverTone } from './coverTone';
import { StatusBadge } from './StatusBadge';
import { formatMonthDay, weekdayLabel } from './tripDateFormat';

function dayLabel(iso: string): string {
  return iso === '' ? '日期待定' : `${weekdayLabel(iso)}出发`;
}

type Props = {
  trip: TripSummary;
  /** 发布者信用状态；由页面层一次取数后下发，缺失时不展示。 */
  credit?: UserCreditEntry;
  /** 发布者成长等级；列表页批量读取后下发，只含 LVn。 */
  growth?: UserGrowthEntry;
  /** 发布页实时预览：不跳详情、不打开资料弹窗。 */
  preview?: boolean;
  /** 首页收藏态；与 onToggleFavorite 同时提供时才渲染心形按钮。 */
  favorited?: boolean;
  onToggleFavorite?: (trip: TripSummary) => void;
  /** 首页卡片底部的「查看详情」动作按钮。 */
  detailAction?: boolean;
};

export function TripCard({
  trip,
  credit,
  growth,
  preview = false,
  favorited = false,
  onToggleFavorite,
  detailAction = false,
}: Props) {
  const { openProfile } = useProfile();
  const joinedRate = trip.capacity === 0 ? 0 : Math.round((trip.joined_count / trip.capacity) * 100);
  const width = Math.min(100, Math.max(0, joinedRate));
  const isFull = trip.status === 'full' || (trip.capacity > 0 && trip.joined_count >= trip.capacity);
  const destination = cityLabel(trip.destination_code) || trip.destination;
  const photo = cityPhoto(destination, trip.destination);
  const cardClass = ['trip-card', isFull ? 'is-full' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cardClass}>
      {preview ? (
        <span className="tc-overlay" aria-hidden="true" />
      ) : (
        <a className="tc-overlay" href={`#/trips/${trip.id}`} aria-label={trip.title} />
      )}
      <div className={`tc-cover cover-${coverTone(trip.destination_code)}`}>
        {photo !== null && (
          <img className="tc-photo" src={photo} alt={`${destination}城市照片`} loading="lazy" />
        )}
        <span className="tc-cover-shade" aria-hidden="true" />
        <StatusBadge status={trip.status} />
        {!preview && onToggleFavorite !== undefined && (
          <button
            type="button"
            className={favorited ? 'tc-fav is-on' : 'tc-fav'}
            aria-pressed={favorited}
            aria-label={favorited ? tripMessages.homeFavoriteRemove : tripMessages.homeFavoriteAdd}
            onClick={() => onToggleFavorite(trip)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 16.4 4.8 11a3.6 3.6 0 0 1 0-5.1 3.5 3.5 0 0 1 5 0l.2.2.2-.2a3.5 3.5 0 0 1 5 0 3.6 3.6 0 0 1 0 5.1Z" />
            </svg>
          </button>
        )}
        <span className="tc-dest">{destination}</span>
      </div>

      <div className="tc-body">
        <h3 className="tc-title">{trip.title}</h3>

        {trip.tags.length > 0 && (
          <div className="tc-tags">
            {trip.tags.map((tag) => (
              <Tag key={tag}>
                {tag}
              </Tag>
            ))}
          </div>
        )}

        <div className="tc-meta">
          <span className="tc-date">
            {formatMonthDay(trip.start_date)} <span aria-hidden="true">→</span>{' '}
            {formatMonthDay(trip.end_date)}
          </span>
          <span className="tc-day">{dayLabel(trip.start_date)}</span>
        </div>

        <p className="tc-route">
          <b>路线</b> {trip.stops.join(' → ')}
        </p>

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
              {growth !== undefined && <GrowthBadge level={growth.level} />}
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
            <span className={isFull ? 'tc-meter is-full' : 'tc-meter'}>
              <Progress percent={width} size="small" showInfo={false} />
            </span>
          </span>
        </div>

        {detailAction && !preview && (
          <a className="tc-detail" href={`#/trips/${trip.id}`}>
            {tripMessages.homeDetailAction}
            <svg viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m4.5 2.5 3.5 3.5-3.5 3.5" />
            </svg>
          </a>
        )}
      </div>
    </article>
  );
}