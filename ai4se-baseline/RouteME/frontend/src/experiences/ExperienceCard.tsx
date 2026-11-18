import { Modal } from 'antd';
import { cityLabel } from '../area/areaOptions';
import { adminMessages } from '../i18n/adminMessages';
import { tripMessages } from '../i18n/tripMessages';
import { Avatar } from '../shell/Avatar';
import { cityPhoto } from '../trips/cityPhotos';
import { coverTone } from '../trips/coverTone';
import { StatusBadge } from '../trips/StatusBadge';
import { intensityLabel } from './experienceForm';
import { ExperienceLikeButton } from './ExperienceLikeButton';
import type { Experience } from '../types';

const INTENSITY_TONE: Record<Experience['intensity'], string> = {
  relaxed: 'jade',
  moderate: 'amber',
  tiring: 'danger',
};

type Props = {
  experience: Experience;
  currentUserId: number;
  onLikeChange: (experience: Experience) => void;
  /** 管理员可见：删除任意一条旅行灵感。 */
  canDelete?: boolean;
  deleting?: boolean;
  onDelete?: (experience: Experience) => void;
};

export function ExperienceCard({
  experience,
  currentUserId,
  onLikeChange,
  canDelete = false,
  deleting = false,
  onDelete,
}: Props) {
  const destination = cityLabel(experience.trip.destination_code) || experience.trip.destination;
  const photo = cityPhoto(destination, experience.trip.destination);

  return (
    <article className="exp-card">
      <div
        className={`exp-cover cover-${coverTone(experience.trip.destination_code)}`}
        aria-hidden="true"
      >
        {photo !== null && (
          <img className="exp-photo" src={photo} alt="" loading="lazy" />
        )}
        <span className="exp-cover-shade" aria-hidden="true" />
        <span className="exp-cover-dest">{destination}</span>
      </div>

      <div className="exp-head">
        <Avatar user={experience.author} size="sm" />
        <a
          className="exp-author"
          href={`#/users/${experience.author.id}`}
          aria-label={`查看 ${experience.author.nickname} 的个人主页`}
        >
          <b>{experience.author.nickname}</b>
          <span>{destination}</span>
        </a>
        <span className={`badge ${INTENSITY_TONE[experience.intensity]}`}>
          {tripMessages.experienceIntensityLabel} · {intensityLabel(experience.intensity)}
        </span>
      </div>

      <p className="exp-quote">{experience.content}</p>

      <div className="exp-advice">
        <b>{tripMessages.experienceAdviceLabel}</b>
        {experience.advice}
      </div>

      <div className="exp-foot">
        <span className="exp-origin">
          来自 <b>{experience.trip.title}</b>
          <StatusBadge status="completed" className="exp-origin-badge" />
        </span>
        <ExperienceLikeButton
          experience={experience}
          currentUserId={currentUserId}
          onChange={onLikeChange}
        />
        <a className="btn sm ghost" href={`#/trips/${experience.trip.id}`}>
          {tripMessages.detailTitle}
        </a>
        <a className="btn sm primary" href={`#/trips/new?from=${experience.trip.id}`}>
          {tripMessages.referencePublish}
        </a>
        {canDelete && onDelete !== undefined && (
          <button
            type="button"
            className="btn sm ghost exp-admin-delete"
            disabled={deleting}
            aria-label={`${adminMessages.experienceDelete}：${experience.trip.title}`}
            onClick={() => {
              Modal.confirm({
                title: adminMessages.experienceDeleteConfirm,
                okText: adminMessages.experienceDelete,
                cancelText: adminMessages.cancel,
                okButtonProps: { danger: true },
                onOk: () => onDelete(experience),
              });
            }}
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4.5 6h11M8 6V4.6h4V6M6.2 6l.6 9.4h6.4l.6-9.4" />
            </svg>
            {adminMessages.experienceDelete}
          </button>
        )}
      </div>
    </article>
  );
}