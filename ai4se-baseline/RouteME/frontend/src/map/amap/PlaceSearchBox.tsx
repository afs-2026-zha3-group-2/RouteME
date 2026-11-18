/** 城市 / 景点 / 地址搜索框：防抖调用高德地点搜索，覆盖加载、空结果与错误状态。 */

import { useEffect, useMemo, useState } from 'react';
import { Input, Spin, Typography } from 'antd';
import {
  AmapApiError,
  amapErrorMessage,
  lastProbeInfocode,
  probeProxy,
  searchPlaces,
  type PlaceResult,
} from './AmapService';

type Props = {
  city?: string;
  onPick: (place: PlaceResult) => void;
  placeholder?: string;
  inputId?: string;
  ariaLabel?: string;
  invalid?: boolean;
};

export function PlaceSearchBox({
  city,
  onPick,
  placeholder = '搜索城市、景点或地址，例如「广州塔」',
  inputId = 'amap-place-search',
  ariaLabel = '搜索城市、景点或地址',
  invalid = false,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  /** 高德为何不可用（Key 平台不匹配 / 后端未配置 / 代理不可达），用于说明降级原因。 */
  const [degradedReason, setDegradedReason] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    probeProxy()
      .then((result) => {
        if (!active) {
          return;
        }
        if (result === 'key-invalid') {
          setDegradedReason(amapErrorMessage(new AmapApiError('AUTH', 'key', lastProbeInfocode())));
        } else if (result === 'not-configured') {
          setDegradedReason(amapErrorMessage(new AmapApiError('NOT_CONFIGURED', 'missing key')));
        } else if (result === 'unavailable') {
          setDegradedReason(amapErrorMessage(new AmapApiError('PROXY_UNAVAILABLE', 'down')));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const keyword = query.trim();

  useEffect(() => {
    if (keyword === '') {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      searchPlaces(keyword, city)
        .then((places) => {
          if (active) {
            setResults(places);
            setLoading(false);
            setActiveIndex(places.length > 0 ? 0 : -1);
          }
        })
        .catch((reason: unknown) => {
          if (active) {
            setResults([]);
            setLoading(false);
            setError(amapErrorMessage(reason));
          }
        });
    }, 320);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [keyword, city]);

  const hasPanel = loading || error !== null || (keyword !== '' && !loading);
  /** 全部结果来自离线地名库：坐标是示意位置，必须告知用户。 */
  const degraded = results.length > 0 && results.every((place) => place.approximate === true);

  const pick = (place: PlaceResult) => {
    onPick(place);
    setQuery('');
    setResults([]);
    setActiveIndex(-1);
    setError(null);
  };

  const typeLabel = useMemo(() => {
    return (type: string) => {
      if (type.startsWith('风景名胜')) {
        return '景点';
      }
      if (type.startsWith('餐饮')) {
        return '餐饮';
      }
      if (type.startsWith('购物')) {
        return '购物';
      }
      if (type.includes('机场') || type.includes('火车站')) {
        return '交通';
      }
      return '地点';
    };
  }, []);

  return (
    <div className="amap-search-box" data-testid="amap-place-search">
      <Input
        id={inputId}
        value={query}
        allowClear
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && results.length > 0) {
            event.preventDefault();
            setActiveIndex((previous) => (previous + 1) % results.length);
          } else if (event.key === 'ArrowUp' && results.length > 0) {
            event.preventDefault();
            setActiveIndex((previous) => (previous <= 0 ? results.length - 1 : previous - 1));
          } else if (event.key === 'Enter') {
            const target = results[activeIndex] ?? results[0];
            if (target !== undefined) {
              event.preventDefault();
              pick(target);
            }
          } else if (event.key === 'Escape') {
            setQuery('');
            setResults([]);
          }
        }}
      />

      {hasPanel && (
        <div className="amap-search-panel" role="listbox" aria-label="搜索结果">
          {loading && (
            <div className="amap-search-state" role="status">
              <Spin size="small" /> 搜索中…
            </div>
          )}
          {!loading && error !== null && (
            <div className="amap-search-state is-error" role="alert">
              {error}
            </div>
          )}
          {!loading && error === null && results.length === 0 && keyword !== '' && (
            <div className="amap-search-state">
              <Typography.Text type="secondary">没有找到「{keyword}」，换个关键词试试。</Typography.Text>
            </div>
          )}
          {!loading && error === null && results.length > 0 && (
            <>
              {degraded && (
                <div className="amap-search-degraded" role="status">
                  高德搜索不可用，以下为内置地名的示意位置（偏差较大）。
                  需要精确位置时，请直接在地图上点选。
                  {degradedReason !== null && (
                    <span className="amap-search-degraded-reason">{degradedReason}</span>
                  )}
                </div>
              )}
              <ul className="amap-search-list">
                {results.map((place, index) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      className={index === activeIndex ? 'amap-search-item is-active' : 'amap-search-item'}
                      onClick={() => pick(place)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="amap-search-name">{place.name}</span>
                      <span className="amap-search-meta">
                        {[place.city, place.district, typeLabel(place.type)]
                          .filter((item) => item !== '')
                          .join(' · ')}
                      </span>
                      {place.approximate === true && (
                        <span className="amap-search-badge">示意位置</span>
                      )}
                      {place.address !== '' && <span className="amap-search-address">{place.address}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}