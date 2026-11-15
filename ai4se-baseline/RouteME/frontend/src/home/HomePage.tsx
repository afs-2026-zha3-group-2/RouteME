import { useState } from 'react';
import { Alert, Button, Input, Segmented, Select, Skeleton, Typography } from 'antd';
import { ExperienceCard } from '../experiences/ExperienceCard';
import { useExperiences } from '../experiences/useExperiences';
import { tripMessages } from '../i18n/tripMessages';
import { EmptyState } from '../shell/EmptyState';
import { TripCard } from '../trips/TripCard';
import {
  describeFilters,
  emptyFilterState,
  hasActiveFilters,
  toggleTag,
  type FilterState,
} from '../trips/tripFilters';
import { DESTINATIONS, INTEREST_TAGS } from '../trips/tripOptions';
import { useMatches } from '../trips/useMatches';
import { greetingForHour } from './greeting';
import { useGreeting } from './useGreeting';
import type { DemoUser } from '../types';

type Props = {
  currentUser: DemoUser;
};

export function HomePage({ currentUser }: Props) {
  const [view, setView] = useState<'plans' | 'experiences'>('plans');
  const [filters, setFilters] = useState<FilterState>(emptyFilterState);
  const { state, reload } = useMatches(currentUser.id, filters);
  const experiences = useExperiences(currentUser.id, filters);

  const update = (patch: Partial<FilterState>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  };

  const openTripCount = state.status === 'ready' ? String(state.matches.length) : '—';
  const experienceCount =
    experiences.state.status === 'ready' ? String(experiences.state.experiences.length) : '—';
  const basis =
    currentUser.interests.length > 0
      ? `匹配对照你的旅行兴趣：${currentUser.interests.join('、')}`
      : '先发布一条行程，匹配会更贴近你的偏好。';
  const summary = describeFilters(filters);

  return (
    <main className="trip-page">
      <section className="disc-hero">
        <h1 className="greet">
          {greetingForHour(new Date().getHours())}，<em>{currentUser.nickname}</em>。
          <br />
          今天想走哪条路？
        </h1>
        <p className="greet-sub">
          这里展示其他同学公开的真实行程与游后体验。看到合适的路线可以直接申请同行，
          也可以参考它发布自己的计划。
        </p>
        <div className="hero-stats">
          <span className="hero-stat">
            <b>{openTripCount}</b>
            <span>招募中的行程</span>
          </span>
          <span className="hero-stat">
            <b>{experienceCount}</b>
            <span>真实游后体验</span>
          </span>
        </div>
        <p className="hero-basis">{basis}</p>
      </section>

      <div className="seg-row">
        <Segmented
          className="view-seg"
          value={view}
          options={[
            { value: 'plans', label: tripMessages.plansView },
            { value: 'experiences', label: tripMessages.experiencesView },
          ]}
          onChange={(value) => setView(value as 'plans' | 'experiences')}
        />
      </div>

      <section className="filters" aria-label="筛选行程">
        <div className="filter-row">
          <label className="field search">
            <span className="label">搜索</span>
            <Input
              allowClear
              placeholder={tripMessages.searchPlaceholder}
              value={filters.q}
              onChange={(event) => update({ q: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="label">{tripMessages.destinationLabel}</span>
            <Select
              aria-label={tripMessages.destinationLabel}
              value={filters.destination}
              options={[
                { value: '', label: tripMessages.anyDestination },
                ...DESTINATIONS.map((destination) => ({ value: destination, label: destination })),
              ]}
              onChange={(destination) => update({ destination })}
            />
          </label>
          <label className="field">
            <span className="label">{tripMessages.dateFromLabel}</span>
            <Input
              type="date"
              aria-label={tripMessages.dateFromLabel}
              value={filters.dateFrom}
              onChange={(event) => update({ dateFrom: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="label">{tripMessages.dateToLabel}</span>
            <Input
              type="date"
              aria-label={tripMessages.dateToLabel}
              value={filters.dateTo}
              onChange={(event) => update({ dateTo: event.target.value })}
            />
          </label>
          {view === 'plans' && (
            <label className="field">
              <span className="label">{tripMessages.sortLabel}</span>
              <Select
                aria-label={tripMessages.sortLabel}
                value={filters.sort}
                options={[
                  { value: 'match', label: tripMessages.sortMatch },
                  { value: 'date', label: tripMessages.sortDate },
                  { value: 'new', label: tripMessages.sortNew },
                ]}
                onChange={(sort) => update({ sort })}
              />
            </label>
          )}
        </div>

        <div className="filter-tags">
          <span className="filter-tags-label">{tripMessages.tagsLabel}</span>
          {INTEREST_TAGS.map((tag) => {
            const checked = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                className={checked ? 'chip on' : 'chip'}
                aria-pressed={checked}
                onClick={() => update({ tags: toggleTag(filters.tags, tag) })}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div className="filter-actions">
          <Button
            size="small"
            disabled={!hasActiveFilters(filters)}
            onClick={() => setFilters(emptyFilterState)}
          >
            {tripMessages.clearFilters}
          </Button>
          <span className="active-summary">
            {summary === ''
              ? '未设置筛选，展示全部公开内容'
              : `${tripMessages.appliedFilters}：${summary}`}
          </span>
        </div>
      </section>

      {view === 'plans' && state.status === 'loading' && (
        <div className="trip-grid">
          {[0, 1, 2].map((key) => (
            <div key={key} className="card-skeleton">
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          ))}
        </div>
      )}

      {view === 'plans' && state.status === 'failed' && (
        <Alert
          type="error"
          showIcon
          title={tripMessages.failedTitle}
          description={state.code}
          action={<Button onClick={reload}>{tripMessages.retry}</Button>}
        />
      )}

      {view === 'plans' && state.status === 'ready' && state.matches.length === 0 && (
        <EmptyState title={tripMessages.emptyTitle} text={tripMessages.emptyHint}>
          <div className="empty-actions">
            <Button disabled={!hasActiveFilters(filters)} onClick={() => setFilters(emptyFilterState)}>
              {tripMessages.clearFilters}
            </Button>
            <Button type="primary" onClick={() => (window.location.hash = '#/trips/new')}>
              {tripMessages.publish}
            </Button>
          </div>
        </EmptyState>
      )}

      {view === 'plans' && state.status === 'ready' && state.matches.length > 0 && (
        <div className="trip-grid">
          {state.matches.map(({ trip, match }) => (
            <TripCard key={trip.id} trip={trip} match={match} />
          ))}
        </div>
      )}

      {view === 'experiences' && experiences.state.status === 'loading' && (
        <div className="experience-grid">
          {[0, 1].map((key) => (
            <div key={key} className="card-skeleton">
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          ))}
        </div>
      )}

      {view === 'experiences' && experiences.state.status === 'failed' && (
        <Alert
          type="error"
          showIcon
          title={tripMessages.failedTitle}
          description={experiences.state.code}
          action={<Button onClick={experiences.reload}>{tripMessages.retry}</Button>}
        />
      )}

      {view === 'experiences' && experiences.state.status === 'ready' && (
        <p className="result-count">
          {experiences.state.experiences.length} {tripMessages.experienceCount}
        </p>
      )}

      {view === 'experiences' &&
        experiences.state.status === 'ready' &&
        experiences.state.experiences.length === 0 && (
          <EmptyState
            title={tripMessages.experienceEmpty}
            text={tripMessages.experienceEmptyHint}
          />
        )}

      {view === 'experiences' &&
        experiences.state.status === 'ready' &&
        experiences.state.experiences.length > 0 && (
          <div className="experience-grid">
            {experiences.state.experiences.map((experience) => (
              <ExperienceCard key={experience.id} experience={experience} />
            ))}
          </div>
        )}

      <ConnectivityNote />
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