import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWeatherForecast } from '../api';
import type { WeatherForecast } from '../types';
import { toCardState, type WeatherCardState } from './weather';

type WeatherRequest = {
  /** 请求序号：只有最新一次请求的响应会被采纳，晚到的旧响应直接丢弃。 */
  token: number;
};

/**
 * 天气请求：目的地或日期变化即重新请求，失败可重试。
 *
 * 缺参时不发请求（返回 idle）；请求进行中主动清空上一次结果，
 * 避免出现「加载中仍显示上一个目的地天气」。
 *
 * `refresh` 会带 `refresh=true` 跳过后端缓存，用于上游预报更新后立刻取新值；
 * 该标记只作用于触发它的那一次请求，后续目的地/日期变化仍走正常缓存。
 */
export function useWeather(destinationCode: string, date: string): {
  state: WeatherCardState;
  retry: () => void;
  refresh: () => void;
} {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const requestRef = useRef<WeatherRequest>({ token: 0 });
  const forceRefreshRef = useRef(false);

  useEffect(() => {
    if (destinationCode.trim() === '' || date.trim() === '') {
      requestRef.current.token += 1;
      forceRefreshRef.current = false;
      setForecast(null);
      setLoading(false);
      setError(false);
      return;
    }
    requestRef.current.token += 1;
    const token = requestRef.current.token;
    const refresh = forceRefreshRef.current;
    forceRefreshRef.current = false;
    setForecast(null);
    setLoading(true);
    setError(false);
    let active = true;
    fetchWeatherForecast(destinationCode, date, undefined, refresh)
      .then((result) => {
        if (!active || requestRef.current.token !== token) {
          return;
        }
        setForecast(result);
        setLoading(false);
      })
      .catch(() => {
        if (!active || requestRef.current.token !== token) {
          return;
        }
        setForecast(null);
        setError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [destinationCode, date, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const refresh = useCallback(() => {
    forceRefreshRef.current = true;
    setAttempt((value) => value + 1);
  }, []);

  return {
    state: toCardState({ destinationCode, date, loading, error, forecast }),
    retry,
    refresh,
  };
}