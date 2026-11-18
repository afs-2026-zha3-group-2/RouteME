import { useCallback, useEffect, useState } from 'react';
import { fetchWeatherForecast, loadUserProfile } from '../api';
import { cityLabel } from '../area/areaOptions';
import { GrowthBadge } from '../growth/GrowthBadge';
import { tripMessages } from '../i18n/tripMessages';
import { Avatar } from '../shell/Avatar';
import { cityPhoto } from '../trips/cityPhotos';
import { formatMonthDay, weekdayLabel } from '../trips/tripDateFormat';
import type { DemoUser, UserProfile, WeatherForecast } from '../types';
import { AiScene, WeatherGlyph } from './HomeScene';

/* ---------- 我的旅行卡：经验 / 信用 / 完成率 ---------- */

export function HomeUserCard({ currentUser }: { currentUser: DemoUser }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadUserProfile(currentUser.id, currentUser.id)
      .then((result) => {
        if (alive) {
          setProfile(result);
        }
      })
      .catch(() => {
        // 右栏统计是增强信息：取数失败时保留占位，不打断首页主流程。
      });
    return () => {
      alive = false;
    };
  }, [currentUser.id]);

  if (closed) {
    return null;
  }

  const completion =
    profile?.route_completion_rate === undefined || profile?.route_completion_rate === null
      ? tripMessages.homeSideCompletionNA
      : `${profile.route_completion_rate}%`;

  return (
    <section className="home-card home-user-card" aria-label="我的旅行卡">
      <button
        type="button"
        className="home-card-close"
        aria-label={tripMessages.homeSideClose}
        onClick={() => setClosed(true)}
      >
        <svg viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="m3 3 6 6M9 3l-6 6" />
        </svg>
      </button>
      <a className="home-user-head" href={`#/users/${currentUser.id}`}>
        <Avatar user={currentUser} size="lg" />
        <span className="home-user-id">
          <b>
            {currentUser.nickname}
            <GrowthBadge level={profile?.growth?.level} maxLevel={profile?.growth?.max_level} />
          </b>
          <i>{currentUser.bio || tripMessages.homeSideUserFallbackBio}</i>
        </span>
      </a>
      <dl className="home-user-stats">
        <div>
          <dt>{tripMessages.homeSideExp}</dt>
          <dd>{profile?.growth?.exp ?? '—'}</dd>
        </div>
        <div>
          <dt>{tripMessages.homeSideCredit}</dt>
          <dd>{profile?.credit_score ?? '—'}</dd>
        </div>
        <div>
          <dt>{tripMessages.homeSideCompletion}</dt>
          <dd>{profile === null ? '—' : completion}</dd>
        </div>
      </dl>
    </section>
  );
}

/* ---------- 目的地天气卡 ---------- */

type WeatherState =
  | { status: 'loading' }
  | { status: 'ready'; forecast: WeatherForecast }
  | { status: 'failed' };

export function HomeWeatherCard({
  destinationCode,
  date,
}: {
  destinationCode: string;
  date: string;
}) {
  const [state, setState] = useState<WeatherState>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    fetchWeatherForecast(destinationCode, date)
      .then((forecast) => {
        if (alive) {
          setState({ status: 'ready', forecast });
        }
      })
      .catch(() => {
        if (alive) {
          setState({ status: 'failed' });
        }
      });
    return () => {
      alive = false;
    };
  }, [destinationCode, date, nonce]);

  const retry = useCallback(() => setNonce((value) => value + 1), []);
  const city = cityLabel(destinationCode) || destinationCode;

  return (
    <section className="home-card home-weather-card" aria-label={tripMessages.homeWeatherTitle}>
      <header className="home-card-head">
        <h3>{tripMessages.homeWeatherTitle}</h3>
        <span className="home-weather-place">
          {city} · {formatMonthDay(date)}（{weekdayLabel(date)}）
        </span>
      </header>

      {state.status === 'loading' && (
        <div className="home-weather-body is-loading" aria-busy="true">
          <span className="home-weather-skeleton" />
          <span className="home-weather-skeleton is-short" />
        </div>
      )}

      {state.status === 'failed' && (
        <div className="home-weather-body is-failed">
          <p>{tripMessages.homeWeatherFailed}</p>
          <button type="button" className="home-link-btn" onClick={retry}>
            {tripMessages.retry}
          </button>
        </div>
      )}

      {state.status === 'ready' && !state.forecast.available && (
        <div className="home-weather-body is-failed">
          <p>{tripMessages.homeWeatherUnavailable}</p>
        </div>
      )}

      {state.status === 'ready' && state.forecast.available && state.forecast.weather !== null && (
        <div className="home-weather-body">
          <div className="home-weather-main">
            <WeatherGlyph code={state.forecast.weather.weather_code} />
            <span className="home-weather-temp">
              <b>{Math.round(state.forecast.weather.temp_max_c)}°C</b>
              <i>{Math.round(state.forecast.weather.temp_min_c)}°C</i>
            </span>
            <span className="home-weather-text">
              {state.forecast.weather.weather_text}
              {state.forecast.weather.precipitation_probability_pct !== null && (
                <small>
                  {tripMessages.homeWeatherRain} {state.forecast.weather.precipitation_probability_pct}%
                </small>
              )}
            </span>
          </div>
          {state.forecast.reminders.length > 0 && (
            <p className="home-weather-advice">
              <b>{tripMessages.homeWeatherAdvice}</b>
              {state.forecast.reminders[0].text}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- AI 规划入口卡 ---------- */

export function HomeAiCard() {
  return (
    <section className="home-card home-ai-card" aria-label={tripMessages.homeAiTitle}>
      <AiScene />
      <div className="home-ai-copy">
        <h3>{tripMessages.homeAiTitle}</h3>
        <p>{tripMessages.homeAiSub}</p>
        <a className="home-ai-action" href="#/ai-planner">
          {tripMessages.homeAiAction}
          <svg viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" />
          </svg>
        </a>
      </div>
    </section>
  );
}

/* ---------- 热门目的地 ---------- */

const HOT_DESTINATIONS: ReadonlyArray<{ name: string; code: string }> = [
  { name: '广州', code: '440100' },
  { name: '珠海', code: '440400' },
  { name: '成都', code: '510100' },
  { name: '上海', code: '310100' },
  { name: '杭州', code: '330100' },
  { name: '厦门', code: '350200' },
];

export function HomeHotDestinations({ onPick }: { onPick: (code: string) => void }) {
  return (
    <section className="home-card home-hot-card" aria-label={tripMessages.homeHotTitle}>
      <header className="home-card-head">
        <h3>{tripMessages.homeHotTitle}</h3>
        <a className="home-card-more" href="#/map">
          {tripMessages.homeHotMore}
          <svg viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4.5 2.5 3.5 3.5-3.5 3.5" />
          </svg>
        </a>
      </header>
      <div className="home-hot-grid">
        {HOT_DESTINATIONS.map((item) => {
          const photo = cityPhoto(item.name);
          return (
            <button
              key={item.code}
              type="button"
              className="home-hot-item"
              onClick={() => onPick(item.code)}
              aria-label={`按${item.name}筛选行程`}
            >
              {photo !== null && <img src={photo} alt="" loading="lazy" />}
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}