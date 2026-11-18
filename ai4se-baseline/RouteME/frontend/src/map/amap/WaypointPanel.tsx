/**
 * 途经点面板：拖拽排序、删除、清空、出行方式与生成路线入口。
 * 只接收 RouteMe 的 RouteWaypoint 模型，不依赖高德实例。
 */

import { useState } from 'react';
import { Button, Segmented, Typography } from 'antd';
import type { RouteWaypoint, TravelMode } from './AmapService';

type Props = {
  waypoints: RouteWaypoint[];
  mode: TravelMode;
  maxStops: number;
  planning: boolean;
  routeRequested: boolean;
  onModeChange: (mode: TravelMode) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onFocus: (id: string) => void;
  onGenerate: () => void;
  /** 默认步行 / 驾车 / 骑行（探索页）；发布页注入自己的三档。 */
  modes?: readonly TravelMode[];
  /** 与 `modes` 配套的标签；缺省用 MODE_LABELS。 */
  modeLabels?: Partial<Record<TravelMode, string>>;
  /** 空态提示；缺省为探索页文案。 */
  emptyHint?: string;
  /** 出行方式分组的可访问名，只影响读屏。 */
  modeAriaLabel?: string;
};

const DEFAULT_MODES: readonly TravelMode[] = ['walking', 'driving', 'bicycling'];
const DEFAULT_EMPTY_HINT = '搜索城市或景点，点击结果加入途经点；至少两个才能生成路线。';

export const MODE_LABELS: Record<TravelMode, string> = {
  walking: '步行',
  driving: '驾车',
  bicycling: '骑行',
  transit: '公共交通',
};

export function WaypointPanel({
  waypoints,
  mode,
  maxStops,
  planning,
  routeRequested,
  onModeChange,
  onReorder,
  onRemove,
  onClear,
  onFocus,
  onGenerate,
  modes = DEFAULT_MODES,
  modeLabels,
  emptyHint = DEFAULT_EMPTY_HINT,
  modeAriaLabel = '出行方式',
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= waypoints.length) {
      return;
    }
    onReorder(index, target);
  };

  return (
    <section className="amap-side-card" data-testid="waypoint-panel">
      <header className="amap-side-head">
        <div>
          <b>已选途经点</b>
          <span>
            {waypoints.length}/{maxStops} · 拖动或上下按钮调整顺序
          </span>
        </div>
        {waypoints.length > 0 && (
          <Button size="small" type="text" danger onClick={onClear}>
            清空
          </Button>
        )}
      </header>

      {waypoints.length === 0 ? (
        <Typography.Text type="secondary" className="amap-side-empty">
          {emptyHint}
        </Typography.Text>
      ) : (
        <ol className="amap-waypoint-list" aria-label="途经点顺序">
          {waypoints.map((waypoint, index) => (
            <li
              key={waypoint.id}
              className={[
                'amap-waypoint',
                dragIndex === index ? 'is-dragging' : '',
                overIndex === index && dragIndex !== index ? 'is-over' : '',
              ]
                .filter((entry) => entry !== '')
                .join(' ')}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null && dragIndex !== index) {
                  onReorder(dragIndex, index);
                }
                setDragIndex(null);
                setOverIndex(null);
              }}
            >
              <span className="amap-waypoint-grip" aria-hidden="true">
                ⋮⋮
              </span>
              <button
                type="button"
                className="amap-waypoint-main"
                onClick={() => onFocus(waypoint.id)}
              >
                <span className="amap-waypoint-index">{index + 1}</span>
                <span className="amap-waypoint-text">
                  <b>{waypoint.name}</b>
                  {waypoint.address !== undefined && waypoint.address !== '' && (
                    <span>{waypoint.address}</span>
                  )}
                </span>
              </button>
              <span className="amap-waypoint-tools">
                <button type="button" aria-label={`上移 ${waypoint.name}`} onClick={() => move(index, -1)}>
                  ↑
                </button>
                <button type="button" aria-label={`下移 ${waypoint.name}`} onClick={() => move(index, 1)}>
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`移除 ${waypoint.name}`}
                  onClick={() => onRemove(waypoint.id)}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="amap-mode-row">
        <span className="amap-mode-label">出行方式</span>
        <Segmented
          size="small"
          aria-label={modeAriaLabel}
          value={mode}
          onChange={(value) => onModeChange(value as TravelMode)}
          options={modes.map((value) => ({
            label: modeLabels?.[value] ?? MODE_LABELS[value],
            value,
          }))}
        />
      </div>

      <Button
        type="primary"
        block
        loading={planning}
        disabled={waypoints.length < 2}
        onClick={onGenerate}
        data-testid="amap-route-generate"
      >
        {routeRequested ? '重新生成旅行路线' : '生成旅行路线'}
      </Button>
      {waypoints.length < 2 && (
        <Typography.Text type="secondary" className="amap-side-hint">
          至少选择两个途经点后才能生成路线。
        </Typography.Text>
      )}
    </section>
  );
}