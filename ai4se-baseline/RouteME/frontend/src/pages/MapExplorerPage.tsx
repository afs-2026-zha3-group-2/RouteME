/**
 * 旅行地图探索页（高德 JS API 2.0）。
 *
 * 搜索城市/景点/地址 → 加入途经点 → 拖拽排序 → 选择步行/驾车/骑行 →
 * 高德路线规划 → 真实距离/时间/编号 Marker → 同行者匹配 → 查看资料/发起邀请。
 *
 * 页面只持有 RouteMe 数据模型（RouteWaypoint / RoutePlan / CompanionMatch），
 * 高德实例由 AmapContainer 管理，避免业务状态与地图 SDK 强耦合。
 */

import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, DatePicker, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { findCity } from '../area/areaOptions';
import { MAX_STOPS } from '../trips/tripOptions';
import { appDatePickerProps } from '../utils/datePickerProps';
import {
  amapErrorMessage,
  aroundPlaces,
  formatDistance,
  formatDuration,
  geocodePlace,
  planRoute,
  reverseGeocode,
  scenicSpots,
  straightLineRoute,
  type NearbyPlace,
  type PlaceResult,
  type RoutePlan,
  type RouteWaypoint,
  type TravelMode,
} from '../map/amap/AmapService';
import { AmapContainer } from '../map/amap/AmapContainer';
import { ItineraryPanel } from '../map/amap/ItineraryPanel';
import { PlaceSearchBox } from '../map/amap/PlaceSearchBox';
import { RouteLayer } from '../map/amap/RouteLayer';
import { ScenicLayer } from '../map/amap/ScenicLayer';
import { TravelerMatchPanel } from '../map/amap/TravelerMatchPanel';
import { WaypointPanel } from '../map/amap/WaypointPanel';
import { matchCompanions, topCompanionMatch } from '../map/amap/companions';
import { MOCK_COMPANIONS } from '../map/amap/mockCompanions';
import { buildSavedRoute, saveRoute } from '../map/amap/savedRoutes';
import type { AmapMap, LngLat } from '../map/amap/types';

type Props = {
  provinceCode?: string;
  cityCode?: string;
};

const CHINA_CENTER: LngLat = [104.1954, 35.8617];

function toWaypoint(place: PlaceResult): RouteWaypoint {
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    lng: place.lng,
    lat: place.lat,
  };
}

export function MapExplorerPage({ provinceCode, cityCode }: Props) {
  const initialCity = findCity(cityCode ?? provinceCode);
  const [cityName, setCityName] = useState(
    initialCity?.cityDisplayName.replace(/市$/, '') ?? '中国',
  );
  const [center, setCenter] = useState<LngLat>(CHINA_CENTER);
  const [zoom, setZoom] = useState(4);
  const [map, setMap] = useState<AmapMap | null>(null);
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [mode, setMode] = useState<TravelMode>('walking');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [route, setRoute] = useState<RoutePlan | null>(null);
  const [routeRequested, setRouteRequested] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [estimateNote, setEstimateNote] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<NearbyPlace | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  /** 点击位置本身（坐标精确等于点击点，仅用逆地理取名称）。 */
  const [clickedPoint, setClickedPoint] = useState<PlaceResult | null>(null);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  /** 当前视野附近的景点图钉（恢复「景点型地图」的点击入口）。 */
  const [scenic, setScenic] = useState<NearbyPlace[]>([]);
  const [scenicOn, setScenicOn] = useState(true);
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ]);

  // 从 URL 带来的城市（#/map/440000/440100）直接定位到该城；#/map 显示全国。
  useEffect(() => {
    if (initialCity === undefined) {
      return;
    }
    let active = true;
    const name = initialCity.cityDisplayName.replace(/市$/, '');
    geocodePlace(name, initialCity.cityName)
      .then((place) => {
        if (active && place !== null) {
          setCenter([place.lng, place.lat]);
          setZoom(11);
          setCityName(name);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [initialCity?.cityCode]);

  const addPlace = (place: PlaceResult) => {
    const existing = waypoints.find((waypoint) => waypoint.id === place.id);
    if (existing !== undefined) {
      setFocusId(existing.id);
      setCenter([existing.lng, existing.lat]);
      return;
    }
    if (waypoints.length >= MAX_STOPS) {
      message.warning(`最多选择 ${MAX_STOPS} 个途经点`);
      return;
    }
    const waypoint = toWaypoint(place);
    setWaypoints((previous) => [...previous, waypoint]);
    setFocusId(waypoint.id);
    setCenter([waypoint.lng, waypoint.lat]);
    setZoom(14);
    if (place.city !== '') {
      setCityName(place.city.replace(/市$/, ''));
    }
    message.success(`已加入「${place.name}」`);
  };

  const handleMapClick = (point: LngLat) => {
    setCandidate(null);
    setClickedPoint(null);
    setCandidateLoading(true);
    // 两条并行信息：点击点本身（坐标永不偏移）+ 最近的 POI（便于命名景点）。
    reverseGeocode(point[0], point[1])
      .then((place) => setClickedPoint(place))
      .catch(() => undefined);
    aroundPlaces(point[0], point[1], 500)
      .then((places) => {
        if (places.length === 0) {
          return;
        }
        // aroundPlaces 已按距离排序：只推荐最近的一个，避免远处 POI 抢占。
        setCandidate(places[0]);
      })
      .catch((reason: unknown) => {
        message.warning(amapErrorMessage(reason));
      })
      .finally(() => setCandidateLoading(false));
  };

  useEffect(() => {
    if (!routeRequested || waypoints.length < 2) {
      setRoute(null);
      setEstimateNote(null);
      return;
    }
    let active = true;
    setPlanning(true);
    setRouteError(null);
    setEstimateNote(null);
    planRoute(mode, waypoints)
      .then((plan) => {
        if (active) {
          setRoute(plan);
          setPlanning(false);
        }
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }
        // 路线服务不可用时仍按直线展示途经点顺序，避免整块地图空白。
        setPlanning(false);
        try {
          setRoute(straightLineRoute(mode, waypoints));
          setRouteError(null);
          setEstimateNote(
            `高德路线服务不可用（${amapErrorMessage(reason)}），已按直线显示途经点顺序，距离与时间为本地估算。`,
          );
        } catch {
          setRoute(null);
          setRouteError(amapErrorMessage(reason));
        }
      });
    return () => {
      active = false;
    };
  }, [routeRequested, waypoints, mode]);

  useEffect(() => {
    if (waypoints.length < 2) {
      setRouteRequested(false);
    }
  }, [waypoints.length]);

  useEffect(() => {
    if (!scenicOn || map === null) {
      setScenic([]);
      return;
    }
    let active = true;
    let timer: number | null = null;
    let token = 0;

    const load = () => {
      const currentZoom = map.getZoom();
      // 全国 / 省级视野不需要景点图钉：既没意义，也会白花配额。
      if (currentZoom < 11) {
        setScenic([]);
        return;
      }
      const center = map.getCenter();
      const request = ++token;
      scenicSpots(center.getLng(), center.getLat(), cityName).then((spots) => {
        if (active && request === token) {
          setScenic(spots);
        }
      });
    };

    // 地图平移/缩放后 800ms 再取，避免拖动过程中连续请求。
    const unsubscribe = map.onChange(() => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(load, 800);
    });

    // 首次进入（例如 #/map/440000/440100 直接定位到城市）不会触发 change，
    // 等容器测量完成后再主动取一次。
    timer = window.setTimeout(load, 600);

    return () => {
      active = false;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      unsubscribe();
    };
  }, [map, scenicOn, cityName]);

  useEffect(() => {
    setSavedLabel(null);
  }, [waypoints, mode, dateRange]);

  const reorder = (from: number, to: number) => {
    setWaypoints((previous) => {
      const next = [...previous];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setFocusId(null);
  };

  const remove = (id: string) => {
    setWaypoints((previous) => previous.filter((waypoint) => waypoint.id !== id));
    if (focusId === id) {
      setFocusId(null);
    }
  };

  const clear = () => {
    setWaypoints([]);
    setRoute(null);
    setRouteRequested(false);
    setFocusId(null);
    setRouteError(null);
  };

  const generate = () => {
    if (waypoints.length < 2) {
      return;
    }
    setFocusId(null);
    setRouteRequested(true);
  };

  const routeNames = useMemo(() => waypoints.map((waypoint) => waypoint.name), [waypoints]);
  const matches = useMemo(
    () => (route === null ? [] : matchCompanions(routeNames, MOCK_COMPANIONS)),
    [route, routeNames],
  );
  const summary = topCompanionMatch(matches);

  const focusWaypoint = (id: string) => {
    setFocusId(id);
  };

  const save = () => {
    if (route === null) {
      return;
    }
    const saved = buildSavedRoute(waypoints, route, {
      start: dateRange[0],
      end: dateRange[1],
    });
    saveRoute(saved);
    setSavedLabel(
      `已保存 ${saved.stops.length} 个途经点 · ${formatDistance(saved.distanceMeters)}`,
    );
    message.success('路线已保存到本机');
  };

  return (
    <main className="trip-page map-explorer-page">
      <Typography.Title level={2} className="page-title">
        旅行地图
      </Typography.Title>
      <p className="page-subtitle">
        搜索城市或景点 → 加入途经点 → 拖拽排序 → 生成真实路线 → 发现同路的人。
      </p>

      <div className="amap-explorer">
        <div className="amap-explorer-main">
          <AmapContainer
            lng={center[0]}
            lat={center[1]}
            zoom={zoom}
            ariaLabel="旅行地图：搜索地点、加入途经点并查看高德路线"
            onReady={setMap}
            onMapClick={handleMapClick}
          >
            <div className="amap-search-overlay">
              <PlaceSearchBox
                city={cityName === '中国' ? undefined : cityName}
                onPick={addPlace}
              />
            </div>

            {candidateLoading && (
              <div className="amap-candidate is-loading" role="status">
                正在解析点击位置…
              </div>
            )}
            {!candidateLoading && (clickedPoint !== null || candidate !== null) && (
              <div className="amap-candidate" role="dialog" aria-label="地图选点">
                {clickedPoint !== null && (
                  <div className="amap-candidate-row">
                    <div className="amap-candidate-text">
                      <b>{clickedPoint.name}</b>
                      <span>{clickedPoint.address === '' ? '你点击的精确位置' : clickedPoint.address}</span>
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => {
                        addPlace(clickedPoint);
                        setClickedPoint(null);
                        setCandidate(null);
                      }}
                    >
                      使用该位置
                    </Button>
                  </div>
                )}
                {candidate !== null && (
                  <div className="amap-candidate-row">
                    <div className="amap-candidate-text">
                      <b>{candidate.name}</b>
                      <span>
                        {[
                          `附近约 ${formatDistance(candidate.distanceMeters)}`,
                          candidate.address,
                        ]
                          .filter((item) => item !== '')
                          .join(' · ')}
                      </span>
                    </div>
                    <Button
                      size="small"
                      onClick={() => {
                        addPlace(candidate);
                        setCandidate(null);
                        setClickedPoint(null);
                      }}
                    >
                      用这个景点
                    </Button>
                  </div>
                )}
                <button
                  type="button"
                  className="amap-candidate-close"
                  aria-label="关闭地图选点提示"
                  onClick={() => {
                    setCandidate(null);
                    setClickedPoint(null);
                  }}
                >
                  ×
                </button>
              </div>
            )}

            <div className="amap-legend" aria-hidden="true">
              <span>
                <i className="amap-legend-line" />
                旅行路线
              </span>
              <span>
                <i className="amap-legend-stop" />
                编号途经点
              </span>
              <span>
                <i className="amap-legend-scenic" />
                景点（点击加入）
              </span>
              <span className="amap-legend-note">地图数据 © 高德地图</span>
            </div>

            <button
              type="button"
              className={scenicOn ? 'amap-scenic-toggle is-on' : 'amap-scenic-toggle'}
              aria-pressed={scenicOn}
              data-testid="amap-scenic-toggle"
              onClick={() => setScenicOn((previous) => !previous)}
            >
              {scenicOn ? '隐藏景点' : '显示景点'}
            </button>
          </AmapContainer>

          <ScenicLayer
            map={map}
            spots={scenic}
            addedIds={waypoints.map((waypoint) => waypoint.id)}
            onPick={addPlace}
          />

          <RouteLayer
            map={map}
            waypoints={waypoints}
            route={route}
            focusId={focusId}
            onFocus={focusWaypoint}
          />
        </div>

        <aside className="amap-side">
          <section className="amap-side-card">
            <header className="amap-side-head">
              <div>
                <b>{cityName}</b>
                <span>规划城市与日期</span>
              </div>
            </header>
            <DatePicker.RangePicker
              {...appDatePickerProps}
              className="amap-date-range"
              allowClear={false}
              format="YYYY-MM-DD"
              value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
              onChange={(_, strings) => {
                const [start, end] = strings;
                if (start !== '' && end !== '') {
                  setDateRange([start, end]);
                }
              }}
            />
            {route !== null && (
              <p className="amap-side-summary">
                {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)} ·{' '}
                {waypoints.length} 个途经点
              </p>
            )}
          </section>

          <WaypointPanel
            waypoints={waypoints}
            mode={mode}
            maxStops={MAX_STOPS}
            planning={planning}
            routeRequested={routeRequested}
            onModeChange={setMode}
            onReorder={reorder}
            onRemove={remove}
            onClear={clear}
            onFocus={focusWaypoint}
            onGenerate={generate}
          />

          {routeError !== null && (
            <Alert type="error" showIcon title="路线规划失败" description={routeError} />
          )}
          {estimateNote !== null && (
            <Alert type="info" showIcon title="已按直线显示路线" description={estimateNote} />
          )}

          <ItineraryPanel
            waypoints={waypoints}
            route={route}
            focusId={focusId}
            onFocus={focusWaypoint}
          />

          {route !== null && (
            <Button block onClick={save}>
              保存路线
            </Button>
          )}
          {savedLabel !== null && (
            <Typography.Text type="secondary" className="amap-side-hint">
              {savedLabel}
            </Typography.Text>
          )}

          <TravelerMatchPanel
            matches={matches}
            summary={summary}
            onViewProfile={(userId) => {
              window.location.hash = `#/users/${userId}`;
            }}
            onInvite={(tripId) => {
              window.location.hash = `#/trips/${tripId}`;
            }}
          />
        </aside>
      </div>
    </main>
  );
}