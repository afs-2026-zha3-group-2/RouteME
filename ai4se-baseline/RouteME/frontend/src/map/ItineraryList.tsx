/**
 * 行程列表（refine-trip-map R2 / design D15）。
 * 与地图编号双向同步：点击列表项聚焦地图 pin（focusPoiId 高亮当前项），
 * 点击地图 pin / 路线徽标也会高亮对应列表项。非只读模式可移除景点。
 */

import type { Poi } from './data/types';

type Props = {
  /** 按行程顺序排列的已选景点。 */
  pois: Poi[];
  focusPoiId?: string | null;
  readOnly?: boolean;
  onFocusPoi: (poi: Poi) => void;
  onRemovePoi?: (poi: Poi) => void;
};

export function ItineraryList({ pois, focusPoiId, readOnly = false, onFocusPoi, onRemovePoi }: Props) {
  if (pois.length === 0) {
    return (
      <p className="itinerary-empty" data-testid="itinerary-list">
        点击地图上的景点加入行程，至少选择两个景点后可生成路线。
      </p>
    );
  }
  return (
    <ol className="itinerary-list" data-testid="itinerary-list" aria-label="行程顺序">
      {pois.map((poi, index) => (
        <li key={poi.id} className={focusPoiId === poi.id ? 'itinerary-item focused' : 'itinerary-item'}>
          <button type="button" className="itinerary-item-main" onClick={() => onFocusPoi(poi)}>
            <span className="itinerary-index" aria-hidden="true">
              {index + 1}
            </span>
            <span className="itinerary-name">{poi.name}</span>
          </button>
          {!readOnly && onRemovePoi !== undefined && (
            <button
              type="button"
              className="itinerary-remove"
              aria-label={`移除 ${poi.name}`}
              onClick={() => onRemovePoi(poi)}
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}