import { useRef, useState } from 'react';
import { Alert, Button, DatePicker, Segmented, Skeleton, Tag } from 'antd';
import { ExperienceCard } from '../experiences/ExperienceCard';
import { useExperiences } from '../experiences/useExperiences';
import { tripMessages } from '../i18n/tripMessages';
import { useUserCredits } from '../profiles/useUserCredits';
import { EmptyState } from '../shell/EmptyState';
import { SoftSelect } from '../shell/SoftSelect';
import { Pager } from '../shell/Pager';
import { TripCard } from '../trips/TripCard';
import {
  describeFilters,
  emptyFilterState,
  hasActiveFilters,
  toggleTag,
  type FilterState,
} from '../trips/tripFilters';
import { AreaCascader } from '../area/AreaCascader';
import { INTEREST_TAGS } from '../trips/tripOptions';
import { useMatches } from '../trips/useMatches';
import { appDatePickerProps } from '../utils/datePickerProps';
import { dayjsToIso, isoToDayjs } from '../utils/dates';
import { greetingForHour } from './greeting';
import type { DemoUser } from '../types';

type Props = {
  currentUser: DemoUser;
};

export function HomePage({ currentUser }: Props) {
  const [view, setView] = useState<'plans' | 'experiences'>('plans');
  const [filters, setFilters] = useState<FilterState>(emptyFilterState);
  const { state, reload, setPage, setSize } = useMatches(currentUser.id, filters);
  const experiences = useExperiences(currentUser.id, filters);
  const publisherIds = state.status === 'ready' ? state.matches.map(({ trip }) => trip.publisher.id) : [];
  const credits = useUserCredits(publisherIds, currentUser.id);
  const resultsRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<FilterState>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  };

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const summary = describeFilters(filters);

  const goPublish = () => {
    window.location.hash = '#/trips/new';
  };

  const publishAction = (
    <Button type="primary" onClick={goPublish}>
      {tripMessages.goPublish}
    </Button>
  );

  return (
    <main className="trip-page">
      <section className="disc-hero">
        <h1 className="greet">
          {greetingForHour(new Date().getHours())}，<em>{currentUser.nickname}</em>。
          <br />
          今天想走哪条路？
        </h1>
      </section>

      <div className="seg-row">
        <Segmented
          className="view-seg"
          aria-label="浏览视图"
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
          <div className="field">
            <span className="label">{tripMessages.destinationLabel}</span>
            <AreaCascader
              style={{ width: '100%' }}
              ariaLabel={tripMessages.destinationLabel}
              value={filters.destinationCode}
              onChange={(code) => update({ destinationCode: code })}
              placeholder={tripMessages.anyDestination}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="filter-date-from">
              {tripMessages.dateFromLabel}
            </label>
            <DatePicker
              {...appDatePickerProps}
              id="filter-date-from"
              format="YYYY-MM-DD"
              placeholder="不限"
              allowClear
              style={{ width: '100%' }}
              value={isoToDayjs(filters.dateFrom)}
              onChange={(value) => update({ dateFrom: dayjsToIso(value) })}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="filter-date-to">
              {tripMessages.dateToLabel}
            </label>
            <DatePicker
              {...appDatePickerProps}
              id="filter-date-to"
              format="YYYY-MM-DD"
              placeholder="不限"
              allowClear
              style={{ width: '100%' }}
              value={isoToDayjs(filters.dateTo)}
              onChange={(value) => update({ dateTo: dayjsToIso(value) })}
            />
          </div>
          {view === 'plans' && (
            <div className="field">
              <label className="label" htmlFor="filter-sort">
                {tripMessages.sortLabel}
              </label>
              <SoftSelect
                id="filter-sort"
                ariaLabel={tripMessages.sortLabel}
                value={filters.sort}
                options={[
                  { value: 'match', label: tripMessages.sortMatch },
                  { value: 'date', label: tripMessages.sortDate },
                  { value: 'new', label: tripMessages.sortNew },
                ]}
                onChange={(value) => update({ sort: value as FilterState['sort'] })}
              />
            </div>
          )}
        </div>

        <div className="filter-tags">
          <span className="filter-tags-label">{tripMessages.tagsLabel}</span>
          {INTEREST_TAGS.map((tag) => (
            <Tag.CheckableTag
              key={tag}
              checked={filters.tags.includes(tag)}
              onChange={() => update({ tags: toggleTag(filters.tags, tag) })}
            >
              {tag}
            </Tag.CheckableTag>
          ))}
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
        <div
          className="trip-grid"
          aria-busy="true"
          aria-label="正在加载招募中的行程"
        >
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

      {view === 'plans' && state.status === 'ready' && state.total === 0 && (
        <EmptyState title={tripMessages.emptyTitle} text={tripMessages.emptyHint}>
          <div className="empty-actions">
            <Button disabled={!hasActiveFilters(filters)} onClick={() => setFilters(emptyFilterState)}>
              {tripMessages.clearFilters}
            </Button>
            {publishAction}
          </div>
        </EmptyState>
      )}

      {view === 'plans' && state.status === 'ready' && state.total > 0 && (
        <div ref={resultsRef} className="list-block">
          <div className="trip-grid">
            {state.matches.map(({ trip, match }) => (
              <TripCard key={trip.id} trip={trip} match={match} credit={credits[trip.publisher.id]} />
            ))}
          </div>
          <Pager
            page={state.page}
            size={state.size}
            total={state.total}
            totalPages={state.totalPages}
            onPageChange={(next) => {
              setPage(next);
              scrollToResults();
            }}
            onSizeChange={(nextSize) => {
              setSize(nextSize);
              scrollToResults();
            }}
          />
        </div>
      )}

      {view === 'experiences' && experiences.state.status === 'loading' && (
        <div
          className="experience-grid"
          aria-busy="true"
          aria-label="正在加载旅行体验"
        >
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
          {experiences.state.total} {tripMessages.experienceCount}
        </p>
      )}

      {view === 'experiences' &&
        experiences.state.status === 'ready' &&
        experiences.state.total === 0 && (
          <EmptyState
            title={tripMessages.experienceEmpty}
            text={tripMessages.experienceEmptyHint}
          >
            <div className="empty-actions">{publishAction}</div>
          </EmptyState>
        )}

      {view === 'experiences' &&
        experiences.state.status === 'ready' &&
        experiences.state.total > 0 && (
          <div className="list-block">
            <div className="experience-grid">
              {experiences.state.experiences.map((experience) => (
                <ExperienceCard
                  key={experience.id}
                  experience={experience}
                  currentUserId={currentUser.id}
                  onLikeChange={experiences.updateExperience}
                />
              ))}
            </div>
            <Pager
              page={experiences.state.page}
              size={experiences.state.size}
              total={experiences.state.total}
              totalPages={experiences.state.totalPages}
              onPageChange={(next) => {
                experiences.setPage(next);
                scrollToResults();
              }}
              onSizeChange={(nextSize) => {
                experiences.setSize(nextSize);
                scrollToResults();
              }}
            />
          </div>
        )}
    </main>
  );
}
