import { cityLabel } from '../area/areaOptions';
import { tripMessages } from '../i18n/tripMessages';
import { Avatar } from '../shell/Avatar';
import { StatusBadge } from '../trips/StatusBadge';
import { intensityLabel } from './experienceForm';
import type { Experience } from '../types';

const INTENSITY_TONE: Record<Experience['intensity'], string> = {
  relaxed: 'jade',
  moderate: 'amber',
  tiring: 'danger',
};

type Props = {
  experience: Experience;
};

export function ExperienceCard({ experience }: Props) {
  return (
    <article className="exp-card">
      <div className="exp-head">
        <Avatar user={experience.author} size="sm" />
        <span className="exp-author">
          <b>{experience.author.nickname}</b>
          <span>
            {cityLabel(experience.trip.destination_code) || experience.trip.destination}
          </span>
        </span>
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
        <a className="btn sm ghost" href={`#/trips/${experience.trip.id}`}>
          {tripMessages.detailTitle}
        </a>
        <a className="btn sm primary" href={`#/trips/new?from=${experience.trip.id}`}>
          {tripMessages.referencePublish}
        </a>
      </div>
    </article>
  );
}