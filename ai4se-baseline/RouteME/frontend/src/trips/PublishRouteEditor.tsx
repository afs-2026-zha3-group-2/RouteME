/**
 * 发布页路线编辑器：复用探索页的地图、搜索、途经点与行程面板。
 *
 * <p>坐标只活在编辑期（`RouteWaypoint[]`），表单仍只收地名：每次增删 / 排序 /
 * 改名都用 `projectStops` 投影回 `stops: string[]`。父级名称是权威，编辑器坐标是权威；
 * 父级变化（AI 预填 / 参考行程 / 草稿）时按名称重新解析，解析失败的仍按名称保留。
 */

import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Typography, message } from 'antd';
import { tripMessages } from '../i18n/tripMessages';
import {
  aroundPlaces,
  formatDistance,
  geocodePlace,
  reverseGeocode,
  type NearbyPlace,
  type PlaceResult,
  type RouteWaypoint,
} from '../map/amap/AmapService';
import { AmapContainer } from '../map/amap/AmapContainer';
import { ItineraryPanel } from '../map/amap/ItineraryPanel';
import { PlaceSearchBox } from '../map/amap/PlaceSearchBox';
import { RouteLayer } from '../map/amap/RouteLayer';
import { WaypointPanel } from '../map/amap/WaypointPanel';
import {
  isCoordinatePlaceholderName,
  pointFallbackName,
  toPickedPlace,
} from '../map/amap/placePick';
import type { AmapMap, LngLat } from '../map/amap/types';
import { useRoutePlan, type RoutePlanMessages } from '../map/amap/useRoutePlan';
import type { TripTravelMode } from '../types';
import { projectStops } from './publishRoute';
import {
  isTripTravelMode,
  MAX_STOPS,
  TRIP_TRAVEL_MODES,
  TRIP_TRAVEL_MODE_LABELS,
} from './tripOptions';

const DEFAULT_CENTER: LngLat = [113.2644, 23.1291];

/** 发布页只用中性文案：不出现后端、端口、代理、重载或 Key。 */
const ROUTE_MESSAGES: RoutePlanMessages = {
  describeFailure: () => tripMessages.routeFailureNote,
  fallbackNote: () => tripMessages.routeFallbackNote,
};

type Props = {
  /** 父级持有的地名列表（提交口径）。 */
  stops: string[];
  travelMode: TripTravelMode;
  /** 目的地城市（去掉「市」），用于搜索范围与公共交通换乘。 */
  city?: string;
  invalid: boolean;
  onStopsChange: (stops: string[]) => void;
  onTravelModeChange: (mode: TripTravelMode) => void;
};

const KEY_SEPARATOR = '\u0001';

export function PublishRouteEditor({
  stops,
  travelMode,
  city,
  invalid,
  onStopsChange,
  onTravelModeChange,
}: Props) {
  const [located, setLocated] = useState<RouteWaypoint[]>([]);
  const [unlocated, setUnlocated] = useState<string[]>([]);
  const [resolving, setResolving] = useState(false);
  const [map, setMap] = useState<AmapMap | null>(null);
  const [center, setCenter] = useState<LngLat>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(11);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<NearbyPlace | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [clickedPoint, setClickedPoint] = useState<PlaceResult | null>(null);
  /** 逆地理没给出可读名称时，先命名再加入。 */
  const [namingPoint, setNamingPoint] = useState<PlaceResult | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  const locatedRef = useRef<RouteWaypoint[]>([]);
  /** 上一次投影给父级的地名序列：相同说明是编辑器自己的写入，不再解析。 */
  const projectedRef = useRef('');
  const resolveRunRef = useRef(0);
  const cityRef = useRef(city);
  cityRef.current = city;

  const { route, planning, routeError, estimateNote, routeRequested, generate } = useRoutePlan(
    located,
    travelMode,
    city,
    ROUTE_MESSAGES,
  );

  const commit = (nextLocated: RouteWaypoint[], nextUnlocated: string[]) => {
    locatedRef.current = nextLocated;
    setLocated(nextLocated);
    setUnlocated(nextUnlocated);
    const projected = projectStops(nextLocated, nextUnlocated);
    projectedRef.current = projected.join(KEY_SEPARATOR);
    onStopsChange(projected);
  };

  const addPlace = (place: PlaceResult) => {
    const existing = locatedRef.current.find((waypoint) => waypoint.id === place.id);
    if (existing !== undefined) {
      setFocusId(existing.id);
      setCenter([existing.lng, existing.lat]);
      return;
    }
    if (locatedRef.current.length >= MAX_STOPS) {
      message.warning(`最多选择 ${MAX_STOPS} 个途经点`);
      return;
    }
    const waypoint: RouteWaypoint = {
      id: place.id,
      name: place.name,
      address: place.address,
      lng: place.lng,
      lat: place.lat,
    };
    commit([...locatedRef.current, waypoint], unlocated);
    setFocusId(waypoint.id);
    setCenter([waypoint.lng, waypoint.lat]);
    setZoom(14);
  };

  const remove = (id: string) => {
    commit(
      locatedRef.current.filter((waypoint) => waypoint.id !== id),
      unlocated,
    );
    if (focusId === id) {
      setFocusId(null);
    }
  };

  const reorder = (from: number, to: number) => {
    const next = [...locatedRef.current];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next, unlocated);
    setFocusId(null);
  };

  const clear = () => {
    commit([], []);
    setFocusId(null);
  };

  const handleMapClick = (point: LngLat) => {
    setCandidate(null);
    setClickedPoint(null);
    setCandidateLoading(true);
    reverseGeocode(point[0], point[1])
      .then((place) => setClickedPoint(place))
      .catch(() => undefined);
    aroundPlaces(point[0], point[1], 500)
      .then((places) => {
        if (places.length > 0) {
          // aroundPlaces 已按距离排序：只推荐最近的一个。
          setCandidate(places[0]);
        }
      })
      .catch(() => undefined)
      .finally(() => setCandidateLoading(false));
  };

  const useClickedPoint = () => {
    if (clickedPoint === null) {
      return;
    }
    if (isCoordinatePlaceholderName(clickedPoint.name)) {
      setNamingPoint(clickedPoint);
      setNameDraft('');
    } else {
      addPlace(clickedPoint);
    }
    setClickedPoint(null);
    setCandidate(null);
  };

  const confirmName = () => {
    const name = nameDraft.trim();
    if (namingPoint === null || name === '') {
      return;
    }
    addPlace(
      toPickedPlace(
        { lng: namingPoint.lng, lat: namingPoint.lat, place: namingPoint },
        name,
      ),
    );
    setNamingPoint(null);
    setNameDraft('');
  };

  const retryUnlocated = (name: string) => {
    setResolving(true);
    geocodePlace(name, cityRef.current)
      .catch(() => null)
      .then((place) => {
        setResolving(false);
        if (place === null) {
          message.warning(tripMessages.routeUnresolvedRetryFailed);
          return;
        }
        commit(
          [
            ...locatedRef.current,
            {
              id: place.id,
              name,
              address: place.address,
              lng: place.lng,
              lat: place.lat,
            },
          ],
          unlocated.filter((item) => item !== name),
        );
      });
  };

  const removeUnlocated = (name: string) => {
    commit(
      locatedRef.current,
      unlocated.filter((item) => item !== name),
    );
  };

  // 父级改名（预填 / 参考行程 / 草稿）：按名称并发解析，失败的仍按名称保留。
  const stopsKey = stops.join(KEY_SEPARATOR);
  useEffect(() => {
    if (stopsKey === projectedRef.current) {
      return;
    }
    const names = stopsKey === '' ? [] : stopsKey.split(KEY_SEPARATOR);
    const run = ++resolveRunRef.current;
    const slots: Array<RouteWaypoint | null> = names.map(
      (name) => locatedRef.current.find((waypoint) => waypoint.name === name.trim()) ?? null,
    );

    const publish = () => {
      commit(
        slots.filter((waypoint): waypoint is RouteWaypoint => waypoint !== null),
        names.filter((_, index) => slots[index] === null),
      );
    };
    publish();

    const pending = names
      .map((name, index) => ({ name: name.trim(), index }))
      .filter(({ name, index }) => slots[index] === null && name !== '');
    if (pending.length === 0) {
      return;
    }
    setResolving(true);
    Promise.allSettled(
      pending.map(async ({ name, index }) => {
        const place = await geocodePlace(name, cityRef.current);
        if (run !== resolveRunRef.current || place === null) {
          return;
        }
        slots[index] = {
          id: place.id,
          name,
          address: place.address,
          lng: place.lng,
          lat: place.lat,
        };
      }),
    ).then(() => {
      if (run !== resolveRunRef.current) {
        return;
      }
      setResolving(false);
      publish();
    });

    return () => {
      resolveRunRef.current += 1;
    };
    // stopsKey 是 stops 的内容键：只有父级真的改了地名才重新解析。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey]);

  // 选定目的地后把地图移到该城；解析失败保持原视野。
  useEffect(() => {
    if (city === undefined || city === '') {
      return;
    }
    let active = true;
    geocodePlace(city, city)
      .catch(() => null)
      .then((place) => {
        if (active && place !== null) {
          setCenter([place.lng, place.lat]);
          setZoom(11);
        }
      });
    return () => {
      active = false;
    };
  }, [city]);

  return (
    <div className="publish-route-editor" data-testid="publish-route-editor">
      <div className="publish-route-canvas">
        <AmapContainer
          lng={center[0]}
          lat={center[1]}
          zoom={zoom}
          ariaLabel="路线规划地图：点击地图加入途经点"
          onReady={setMap}
          onMapClick={handleMapClick}
        >
          <div className="amap-search-overlay">
            <PlaceSearchBox
              city={city}
              onPick={addPlace}
              inputId="trip-stops"
              ariaLabel={tripMessages.routeSearchAriaLabel}
              placeholder={tripMessages.routeSearchPlaceholder}
              invalid={invalid}
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
                    <span>
                      {clickedPoint.address === '' ? '你点击的精确位置' : clickedPoint.address}
                    </span>
                  </div>
                  <Button size="small" type="primary" onClick={useClickedPoint}>
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
        </AmapContainer>

        <RouteLayer
          map={map}
          waypoints={located}
          route={route}
          focusId={focusId}
          onFocus={setFocusId}
        />
      </div>

      <aside className="publish-route-side">
        <WaypointPanel
          waypoints={located}
          mode={travelMode}
          maxStops={MAX_STOPS}
          planning={planning}
          routeRequested={routeRequested}
          modes={TRIP_TRAVEL_MODES}
          modeLabels={TRIP_TRAVEL_MODE_LABELS}
          emptyHint={tripMessages.routeEmptyHint}
          onModeChange={(next) => {
            if (isTripTravelMode(next)) {
              onTravelModeChange(next);
            }
          }}
          onReorder={reorder}
          onRemove={remove}
          onClear={clear}
          onFocus={setFocusId}
          onGenerate={generate}
        />

        {routeError !== null && (
          <Alert type="error" showIcon title="路线暂时无法生成" description={routeError} />
        )}
        {estimateNote !== null && (
          <Alert type="info" showIcon title="已按直线显示路线" description={estimateNote} />
        )}

        <ItineraryPanel
          waypoints={located}
          route={route}
          focusId={focusId}
          onFocus={setFocusId}
          modeLabels={TRIP_TRAVEL_MODE_LABELS}
        />

        {unlocated.length > 0 && (
          <section className="amap-side-card publish-route-unresolved">
            <header className="amap-side-head">
              <div>
                <b>{tripMessages.routeUnresolvedTitle}</b>
                <span>{tripMessages.routeUnresolvedHint}</span>
              </div>
            </header>
            <ul>
              {unlocated.map((name) => (
                <li key={name}>
                  <span className="publish-route-unresolved-name">{name}</span>
                  <span className="publish-route-unresolved-tools">
                    <button type="button" onClick={() => retryUnlocated(name)}>
                      重新定位
                    </button>
                    <button
                      type="button"
                      aria-label={`移除 ${name}`}
                      onClick={() => removeUnlocated(name)}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {resolving && (
          <Typography.Text type="secondary" className="amap-side-hint" role="status">
            {tripMessages.routePrefillResolving}
          </Typography.Text>
        )}
      </aside>

      <Modal
        open={namingPoint !== null}
        title={tripMessages.routeNamingTitle}
        okText={tripMessages.routeNamingConfirm}
        cancelText={tripMessages.createCancel}
        okButtonProps={{ disabled: nameDraft.trim() === '' }}
        onOk={confirmName}
        onCancel={() => {
          setNamingPoint(null);
          setNameDraft('');
        }}
        destroyOnHidden
      >
        <div data-testid="publish-stop-name-dialog">
          <p className="publish-route-name-hint">{tripMessages.routeNamingPlaceholder}</p>
          <Input
            aria-label="途经点名称"
            value={nameDraft}
            maxLength={40}
            autoFocus
            onChange={(event) => setNameDraft(event.target.value)}
            onPressEnter={confirmName}
          />
          {namingPoint !== null && (
            <p className="publish-route-name-coords">
              {pointFallbackName(namingPoint.lng, namingPoint.lat)}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}