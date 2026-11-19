import { useMemo, useRef, useState } from 'react';
import { Alert, Button, DatePicker, Segmented, Skeleton, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { adminErrorText } from '../admin/adminFormat';
import { deleteAdminExperience } from '../api';
import { cityCodeByName } from '../area/areaOptions';
import { ExperienceCard } from '../experiences/ExperienceCard';
import { useExperiences } from '../experiences/useExperiences';
import { adminMessages } from '../i18n/adminMessages';
import { useStudentGate } from '../identity/StudentVerificationGate';
import { tripMessages } from '../i18n/tripMessages';
import { useUserCredits } from '../profiles/useUserCredits';
import { useGrowthLevels } from '../profiles/useGrowthLevels';
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
import { useTrips } from '../trips/useTrips';
import { appDatePickerProps } from '../utils/datePickerProps';
import { dayjsToIso, isoToDayjs } from '../utils/dates';
import { greetingForHour } from './greeting';
import { useFavorites } from './favorites';
import { HeroScene } from './HomeScene';
import { HomeUserCard } from './HomeSide';
import type { DemoUser, Experience, TripSummary } from '../types';

type Props = {
  currentUser: DemoUser;
  token: string | null;
};

type DaysFilter = 'any' | '1' | '2-3' | '4+';

const DAYS_OPTIONS: ReadonlyArray<{ value: DaysFilter; label: string }> = [
  { value: 'any', label: tripMessages.homeDaysAny },
  { value: '1', label: tripMessages.homeDays1 },
  { value: '2-3', label: tripMessages.homeDays23 },
  { value: '4+', label: tripMessages.homeDays4 },
];

/** 行程天数（含首尾两天）；日期非法时返回 0，由调用方放行。 */
function tripDays(trip: TripSummary): number {
  const start = dayjs(trip.start_date);
  const end = dayjs(trip.end_date);
  if (!start.isValid() || !end.isValid()) {
    return 0;
  }
  return end.diff(start, 'day') + 1;
}

function matchesDays(trip: TripSummary, days: DaysFilter): boolean {
  if (days === 'any') {
    return true;
  }
  const count = tripDays(trip);
  if (count === 0) {
    return true;
  }
  if (days === '1') {
    return count === 1;
  }
  if (days === '2-3') {
    return count >= 2 && count <= 3;
  }
  return count >= 4;
}

function matchesKeyword(trip: TripSummary, keyword: string): boolean {
  if (keyword === '') {
    return true;
  }
  const haystack = [trip.title, trip.destination, ...trip.stops, ...trip.tags].join(' ');
  return haystack.toLowerCase().includes(keyword.toLowerCase());
}

export function HomePage({ currentUser, token }: Props) {
  const [view, setView] = useState<'plans' | 'experiences'>('plans');
  const [filters, setFilters] = useState<FilterState>(emptyFilterState);
  const { state, reload, setPage, setSize } = useTrips(currentUser.id, filters);
  const experiences = useExperiences(currentUser.id, filters);
  const publisherIds = state.status === 'ready' ? state.trips.map((trip) => trip.publisher.id) : [];
  const credits = useUserCredits(publisherIds, currentUser.id);
  const growth = useGrowthLevels(publisherIds, currentUser.id);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const studentGate = useStudentGate(currentUser);

  /* 搜索关键词 / 天数 / 只看收藏：后端契约暂无对应字段，在本页结果集上做客户端筛选。 */
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [days, setDays] = useState<DaysFilter>('any');
  const [favOnly, setFavOnly] = useState(false);
  const favorites = useFavorites(currentUser.id);

  /** 管理员可在旅行灵感列表直接删除任意一条；后端同步清理图片与点赞。 */
  const removeExperience = async (experience: Experience) => {
    if (token === null) {
      return;
    }
    setDeletingId(experience.id);
    try {
      await deleteAdminExperience(token, experience.id);
      message.success(adminMessages.experienceDeleted);
      experiences.reload();
    } catch (caught: unknown) {
      const code = caught instanceof Error ? caught.message : 'UNKNOWN_ERROR';
      message.error(`${adminMessages.experienceDeleteFailed}：${adminErrorText(code)}`);
    } finally {
      setDeletingId(null);
    }
  };

  const update = (patch: Partial<FilterState>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  };

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const visibleTrips = useMemo(() => {
    if (state.status !== 'ready') {
      return [];
    }
    return state.trips.filter(
      (trip) =>
        matchesKeyword(trip, keyword) &&
        matchesDays(trip, days) &&
        (!favOnly || favorites.has(trip.id)),
    );
  }, [state, keyword, days, favOnly, favorites]);

  const clientFilterActive = keyword !== '' || days !== 'any' || favOnly;
  const anyFilterActive = hasActiveFilters(filters) || clientFilterActive;

  const summaryParts = [describeFilters(filters)];
  if (keyword !== '') {
    summaryParts.push(`${tripMessages.homeKeywordLabel}「${keyword}」`);
  }
  if (days !== 'any') {
    summaryParts.push(DAYS_OPTIONS.find((option) => option.value === days)?.label ?? '');
  }
  if (favOnly) {
    summaryParts.push(tripMessages.homeFavOnly);
  }
  const summary = summaryParts.filter((part) => part !== '').join(' · ');

  const resetAll = () => {
    setFilters(emptyFilterState);
    setKeyword('');
    setSearchInput('');
    setDays('any');
    setFavOnly(false);
  };

  /** 搜索：先尝试定位城市，再尝试命中兴趣标签，最后退化为结果集关键词筛选。 */
  const applySearch = () => {
    const text = searchInput.trim();
    if (text === '') {
      setKeyword('');
      return;
    }
    const code = cityCodeByName(text);
    if (code !== '') {
      update({ destinationCode: code });
      setKeyword('');
      setSearchInput('');
      message.success({ content: tripMessages.homeSearchCityHit, key: 'home-search-hit' });
      scrollToResults();
      return;
    }
    const tag = INTEREST_TAGS.find((item) => text.includes(item) || item.includes(text));
    if (tag !== undefined) {
      update({ tags: toggleTag(filters.tags, tag) });
      setKeyword('');
      setSearchInput('');
      message.success({ content: tripMessages.homeSearchTagHit, key: 'home-search-hit' });
      scrollToResults();
      return;
    }
    setKeyword(text);
    scrollToResults();
  };

  const goPublish = () => {
    studentGate.requireVerified(() => {
      window.location.hash = '#/trips/new';
    });
  };

  const publishAction = (
    <Button type="primary" onClick={goPublish}>
      {tripMessages.goPublish}
    </Button>
  );

  return (
    <main className="trip-page home-page">
      {studentGate.prompt}
      <div className="home-layout">
        <div className="home-main">
          <section className="home-hero">
            <HeroScene />
            <div className="home-hero-copy">
              <h1 className="greet home-greet">
                {greetingForHour(new Date().getHours())}，<em>{currentUser.nickname}</em>。
                <br />
                {tripMessages.homeHeroLine}
              </h1>
              <p className="home-hero-sub">{tripMessages.homeHeroSub}</p>
              <form
                className="home-search"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  applySearch();
                }}
              >
                <svg className="home-search-icon" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="8" cy="8" r="5.2" />
                  <path d="m12 12 3.6 3.6" />
                </svg>
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={tripMessages.homeSearchPlaceholder}
                  aria-label={tripMessages.homeSearchAction}
                />
                <button type="submit">{tripMessages.homeSearchAction}</button>
              </form>
              <div className="seg-row home-seg-row">
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
            </div>
            <p className="home-hero-note" aria-hidden="true">
              {tripMessages.homeHeroNote1}
              <br />
              {tripMessages.homeHeroNote2}
            </p>
          </section>

          <section className="filters home-filters" aria-label="筛选行程">
            <div className="filter-row home-pill-row">
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
                <span className="label">{tripMessages.homeDateRangeLabel}</span>
                <div className="home-date-range">
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
                  <span className="home-date-sep" aria-hidden="true">→</span>
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
              </div>
              <div className="field">
                <span className="label">{tripMessages.homeDaysLabel}</span>
                <SoftSelect
                  ariaLabel={tripMessages.homeDaysLabel}
                  value={days}
                  options={DAYS_OPTIONS}
                  onChange={(value) => setDays(value as DaysFilter)}
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
                      { value: 'date', label: tripMessages.sortDate },
                      { value: 'new', label: tripMessages.sortNew },
                    ]}
                    onChange={(value) => update({ sort: value as FilterState['sort'] })}
                  />
                </div>
              )}
            </div>

            <div className="filter-tags">
              <span className="filter-tags-label">{tripMessages.homeTagsLabel}</span>
              {INTEREST_TAGS.map((tag) => (
                <Tag.CheckableTag
                  key={tag}
                  checked={filters.tags.includes(tag)}
                  onChange={() => update({ tags: toggleTag(filters.tags, tag) })}
                >
                  {tag}
                </Tag.CheckableTag>
              ))}
              <Tag.CheckableTag
                className="home-fav-toggle"
                checked={favOnly}
                onChange={(checked) => setFavOnly(checked)}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 16.4 4.8 11a3.6 3.6 0 0 1 0-5.1 3.5 3.5 0 0 1 5 0l.2.2.2-.2a3.5 3.5 0 0 1 5 0 3.6 3.6 0 0 1 0 5.1Z" />
                </svg>
                {tripMessages.homeFavOnly}
              </Tag.CheckableTag>
            </div>

            <div className="filter-actions">
              <Button size="small" disabled={!anyFilterActive} onClick={resetAll}>
                {tripMessages.clearFilters}
              </Button>
              {keyword !== '' && (
                <button
                  type="button"
                  className="home-keyword-chip"
                  onClick={() => {
                    setKeyword('');
                    setSearchInput('');
                  }}
                  aria-label={`清除关键词 ${keyword}`}
                >
                  {tripMessages.homeKeywordLabel}：{keyword}
                  <span aria-hidden="true">×</span>
                </button>
              )}
              <span className="active-summary">
                {summary === ''
                  ? '未设置筛选，展示全部公开内容'
                  : `${tripMessages.appliedFilters}：${summary}`}
              </span>
            </div>
          </section>

          {view === 'plans' && (
            <header className="home-rec-head">
              <div className="home-rec-copy">
                <h2>
                  <svg className="home-rec-flame" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10.6 1.8c.5 3-1.4 4.4-2.8 6C6.3 9.5 5 11.2 5 13.4A5.2 5.2 0 0 0 10.2 18.6 5.4 5.4 0 0 0 15.6 13c0-2.4-1.2-4-2.4-5.6-.4 1-1 1.6-1.8 2.2.2-2.8-.2-5.4-.8-7.8z" />
                    <path d="M10.2 18.6a3 3 0 0 1-3-3.1c0-1.4 1-2.3 1.9-3.3.3 1 .9 1.4 1.6 1.9 1 .7 1.7 1.4 1.7 2.6a2.6 2.6 0 0 1-2.2 1.9z" fill="#ffd98a" />
                  </svg>
                  {tripMessages.homeRecTitle}
                </h2>
                <p>{tripMessages.homeRecSub}</p>
              </div>
              <button type="button" className="home-view-all" onClick={resetAll}>
                {tripMessages.homeViewAll}
                <svg viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m4.5 2.5 3.5 3.5-3.5 3.5" />
                </svg>
              </button>
            </header>
          )}

          {view === 'plans' && state.status === 'loading' && (
            <div className="trip-grid" aria-busy="true" aria-label="正在加载招募中的行程">
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
                <Button disabled={!anyFilterActive} onClick={resetAll}>
                  {tripMessages.clearFilters}
                </Button>
                {publishAction}
              </div>
            </EmptyState>
          )}

          {view === 'plans' &&
            state.status === 'ready' &&
            state.total > 0 &&
            visibleTrips.length === 0 && (
              <EmptyState
                title={favOnly ? tripMessages.homeFavEmptyTitle : tripMessages.emptyTitle}
                text={favOnly ? tripMessages.homeFavEmptyHint : tripMessages.emptyHint}
              >
                <div className="empty-actions">
                  <Button onClick={resetAll}>{tripMessages.clearFilters}</Button>
                </div>
              </EmptyState>
            )}

          {view === 'plans' && state.status === 'ready' && visibleTrips.length > 0 && (
            <div ref={resultsRef} className="list-block">
              {clientFilterActive && (
                <p className="result-count home-client-note">
                  本页匹配 {visibleTrips.length} / {state.trips.length} 条 · 翻页可继续浏览
                </p>
              )}
              <div className="trip-grid">
                {visibleTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    credit={credits[trip.publisher.id]}
                    growth={growth[trip.publisher.id]}
                    favorited={favorites.has(trip.id)}
                    onToggleFavorite={(target) => favorites.toggle(target.id)}
                    detailAction
                  />
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
            <div className="experience-grid" aria-busy="true" aria-label="正在加载旅行体验">
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
                      canDelete={currentUser.role === 'ADMIN' && token !== null}
                      deleting={deletingId === experience.id}
                      onDelete={removeExperience}
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
        </div>

        <aside className="home-side" aria-label="旅途助手">
          <HomeUserCard currentUser={currentUser} />
        </aside>
      </div>
    </main>
  );
}