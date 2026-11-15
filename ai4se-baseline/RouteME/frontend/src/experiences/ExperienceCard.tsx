import { Button, Card, Space, Tag, Typography } from 'antd';
import { tripMessages } from '../i18n/tripMessages';
import { intensityLabel } from './experienceForm';
import type { Experience } from '../types';

const INTENSITY_COLOR: Record<Experience['intensity'], string> = {
  relaxed: 'green',
  moderate: 'gold',
  tiring: 'red',
};

type Props = {
  experience: Experience;
};

export function ExperienceCard({ experience }: Props) {
  const summary =
    experience.content.length > 90 ? `${experience.content.slice(0, 90)}…` : experience.content;
  return (
    <Card className="experience-card">
      <Space orientation="vertical" size="small" className="home-stack">
        <div className={`experience-cover experience-cover-${experience.trip.destination}`} />
        <Space size="small" wrap>
          <Tag color={INTENSITY_COLOR[experience.intensity]}>
            {tripMessages.experienceIntensityLabel} · {intensityLabel(experience.intensity)}
          </Tag>
          <Tag>{experience.trip.destination}</Tag>
        </Space>
        <a className="experience-title" href={`#/trips/${experience.trip.id}`}>
          {experience.trip.title}
        </a>
        <Typography.Text type="secondary">
          {experience.author.nickname} · {experience.trip.start_date} → {experience.trip.end_date}
        </Typography.Text>
        <Typography.Paragraph className="experience-summary">{summary}</Typography.Paragraph>
        <Typography.Text>
          <Typography.Text strong>{tripMessages.experienceAdviceLabel}：</Typography.Text>
          {experience.advice}
        </Typography.Text>
        <Space size="small" wrap>
          <a href={`#/trips/${experience.trip.id}`}>{tripMessages.detailTitle}</a>
          <Button
            size="small"
            onClick={() => (window.location.hash = `#/trips/new?from=${experience.trip.id}`)}
          >
            {tripMessages.referencePublish}
          </Button>
        </Space>
      </Space>
    </Card>
  );
}