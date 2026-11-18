import { Alert, Button, Card, Spin, Tag } from 'antd';
import { reminderLabel, weatherMessages } from './messages';
import { useWeather } from './useWeather';
import {
  dateLabel,
  reminderTone,
  temperatureLabel,
  weatherFacts,
} from './weather';

type Props = {
  destinationCode: string;
  /** 旅行首日（yyyy-MM-dd）；详情页取行程开始日期。 */
  date: string;
  className?: string;
};

/**
 * 目的地天气卡：发布页与详情页共用。
 *
 * 只渲染后端返回的真实天气与提醒；加载、失败、越界与未就绪四态都不展示任何天气数值。
 * 可用态提供「刷新天气」：带 refresh=true 跳过服务端缓存，立即取最新预报。
 */
export function WeatherCard({ destinationCode, date, className }: Props) {
  const { state, retry, refresh } = useWeather(destinationCode, date);
  const classes = className === undefined ? 'panel weather-card' : `panel weather-card ${className}`;

  return (
    <Card className={classes} data-testid="weather-card">
      <div className="weather-head">
        <h3 className="panel-title">{weatherMessages.title}</h3>
        {state.kind === 'ready' && (
          <div className="weather-head-actions">
            <Tag className="weather-source">{weatherMessages.source}</Tag>
            <Button
              type="link"
              size="small"
              onClick={refresh}
              data-testid="weather-refresh"
            >
              {weatherMessages.refresh}
            </Button>
          </div>
        )}
      </div>

      {state.kind === 'idle' && (
        <p className="form-hint" data-testid="weather-idle">
          {weatherMessages.idle}
        </p>
      )}

      {state.kind === 'loading' && (
        <div className="weather-loading" data-testid="weather-loading" role="status">
          <Spin size="small" />
          <span>{weatherMessages.loading}</span>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="weather-error" data-testid="weather-error" role="alert">
          <Alert type="warning" showIcon title={weatherMessages.failed} />
          <Button size="small" onClick={retry} data-testid="weather-retry">
            {weatherMessages.retry}
          </Button>
        </div>
      )}

      {state.kind === 'unavailable' && (
        <div data-testid="weather-out-of-range">
          <Alert
            type="info"
            showIcon
            title={weatherMessages.outOfRange}
            description={weatherMessages.outOfRangeHint}
          />
        </div>
      )}

      {state.kind === 'ready' && (
        <div data-testid="weather-ready">
          <div className="weather-main">
            <span className="weather-temp">{temperatureLabel(state.forecast)}</span>
            <span className="weather-text">
              {state.forecast.weather === null ? '' : state.forecast.weather.weather_text}
            </span>
          </div>
          <p className="weather-date">
            {dateLabel(state.forecast.date)}
            {state.forecast.city === null || state.forecast.city === ''
              ? ''
              : ` · ${state.forecast.city}`}
          </p>
          <dl className="weather-facts">
            {weatherFacts(state.forecast, {
              rainProbability: weatherMessages.factsRainProbability,
              precipitation: weatherMessages.factsPrecipitation,
              wind: weatherMessages.factsWind,
              uv: weatherMessages.factsUv,
            }).map((fact) => (
              <div key={fact.key} className="weather-fact">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          {state.forecast.reminders.length > 0 && (
            <ul className="weather-reminders">
              {state.forecast.reminders.map((reminder) => (
                <li
                  key={`${reminder.code}-${reminder.text}`}
                  className={`weather-reminder weather-reminder-${reminderTone(reminder.code)}`}
                  data-testid="weather-reminder"
                >
                  <Tag className="weather-reminder-tag">{reminderLabel(reminder.code)}</Tag>
                  <span>{reminder.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}