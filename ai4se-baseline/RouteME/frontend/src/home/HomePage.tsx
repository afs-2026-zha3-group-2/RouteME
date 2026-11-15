import { useState } from 'react';
import { Alert, Button, Card, Empty, Input, Select, Skeleton, Space, Tag, Typography } from 'antd';
import { tripMessages } from '../i18n/tripMessages';
import {
  emptyFilterState,
  hasActiveFilters,
  toggleTag,
  type FilterState,
} from '../trips/tripFilters';
import { DESTINATIONS, INTEREST_TAGS } from '../trips/tripOptions';
import { statusColor, statusLabel } from '../trips/tripStatus';
import { useTrips } from '../trips/useTrips';
import { useGreeting } from './useGreeting';
import type { DemoUser } from '../types';

type Props = {
  currentUser: DemoUser;
};

export function HomePage({ currentUser }: Props) {
  const [filters, setFilters] = useState<FilterState>(emptyFilterState);
  const { state, reload } = useTrips(currentUser.id, filters);

  const update = (patch: Partial<FilterState>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  };

  return (
    <main className="trip-page">
      <Space orientation="vertical" size="large" className="trip-stack">
        <Typography.Title level={2} className="trip-heading">
          {tripMessages.homeTitle}
        </Typography.Title>

        <Card className="filter-card">
          <Space orientation="vertical" size="small" className="home-stack">
            <div className="filter-row">
              <Input
                allowClear
                placeholder={tripMessages.searchPlaceholder}
                value={filters.q}
                onChange={(event) => update({ q: event.target.value })}
              />
              <Select
                aria-label={tripMessages.destinationLabel}
                value={filters.destination}
                options={[
                  { value: '', label: tripMessages.anyDestination },
                  ...DESTINATIONS.map((destination) => ({ value: destination, label: destination })),
                ]}
                onChange={(destination) => update({ destination })}
              />
              <Input
                type="date"
                aria-label={tripMessages.dateFromLabel}
                value={filters.dateFrom}
                onChange={(event) => update({ dateFrom: event.target.value })}
              />
              <Input
                type="date"
                aria-label={tripMessages.dateToLabel}
                value={filters.dateTo}
                onChange={(event) => update({ dateTo: event.target.value })}
              />
              <Select
                aria-label={tripMessages.sortLabel}
                value={filters.sort}
                options={[
                  { value: 'date', label: tripMessages.sortDate },
                  { value: 'new', label: tripMessages.sortNew },
                ]}
                onChange={(sort) => update({ sort })}
              />
            </div>
            <Space size={[4, 4]} wrap>
              <Typography.Text type="secondary">{tripMessages.tagsLabel}</Typography.Text>
              {INTEREST_TAGS.map((tag) => (
                <Tag.CheckableTag
                  key={tag}
                  checked={filters.tags.includes(tag)}
                  onChange={() => update({ tags: toggleTag(filters.tags, tag) })}
                >
                  {tag}
                </Tag.CheckableTag>
              ))}
            </Space>
            <Space size="small">
              {hasActiveFilters(filters) && (
                <Typography.Text type="secondary">{tripMessages.appliedFilters}</Typography.Text>
              )}
              <Button
                size="small"
                disabled={!hasActiveFilters(filters)}
                onClick={() => setFilters(emptyFilterState)}
              >
                {tripMessages.clearFilters}
              </Button>
            </Space>
          </Space>
        </Card>

        {state.status === 'loading' && (
          <div className="trip-grid">
            {[0, 1, 2].map((key) => (
              <Card key={key} className="trip-card">
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            ))}
          </div>
        )}

        {state.status === 'failed' && (
          <Alert
            type="error"
            showIcon
            message={tripMessages.failedTitle}
            description={state.code}
            action={<Button onClick={reload}>{tripMessages.retry}</Button>}
          />
        )}

        {state.status === 'ready' && state.trips.length === 0 && (
          <Empty description={`${tripMessages.emptyTitle} ${tripMessages.emptyHint}`}>
            <Button type="primary" onClick={() => (window.location.hash = '#/trips/new')}>
              {tripMessages.publish}
            </Button>
          </Empty>
        )}

        {state.status === 'ready' && state.trips.length > 0 && (
          <div className="trip-grid">
            {state.trips.map((trip) => (
              <a key={trip.id} className="trip-card-link" href={`#/trips/${trip.id}`}>
                <Card hoverable className="trip-card">
                  <Space orientation="vertical" size="small" className="home-stack">
                    <Space size="small" wrap>
                      <Tag color={statusColor(trip.status)}>{statusLabel(trip.status)}</Tag>
                      <Tag>{trip.destination}</Tag>
                    </Space>
                    <Typography.Title level={4} className="trip-title">
                      {trip.title}
                    </Typography.Title>
                    <Typography.Text type="secondary">
                      {trip.start_date} → {trip.end_date}
                    </Typography.Text>
                    <Typography.Text>{trip.stops.slice(0, 2).join(' · ')}</Typography.Text>
                    <Space size={[4, 4]} wrap>
                      {trip.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </Space>
                    <Space size="middle">
                      <Typography.Text type="secondary">{trip.publisher.nickname}</Typography.Text>
                      <Typography.Text>
                        {tripMessages.joinedLabel} {trip.joined_count}/{trip.capacity}
                        {tripMessages.peopleUnit}
                      </Typography.Text>
                    </Space>
                  </Space>
                </Card>
              </a>
            ))}
          </div>
        )}
                <ConnectivityNote />
              </Space>
            </main>
          );
        }

        /**
         * 保留 hello-world 的验收能力：首页仍能证明问候语来自后端 SQLite。
         */
        function ConnectivityNote() {
          const { state } = useGreeting();
          if (state.status !== 'ready') {
            return null;
          }
          return (
            <Typography.Text type="secondary" className="connectivity-note">
              {tripMessages.connectivityLabel}：{state.greeting.message}
            </Typography.Text>
          );
        }