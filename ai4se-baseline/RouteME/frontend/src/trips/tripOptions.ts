import { CITY_NAMES } from '../map/placeCatalog';
import type { TripTravelMode } from '../types';

/**
 * Destination suggestions come from the offline map gazetteer, so the filter
 * list and the map picker can never drift apart.
 */
export const DESTINATIONS: readonly string[] = CITY_NAMES;

export const INTEREST_TAGS = [
  '摄影',
  '美食',
  '海边',
  '徒步',
  '露营',
  '历史',
  '展览',
  '夜景',
  '自然',
  '骑行',
  '市集',
  '温泉',
] as const;

export const MIN_CAPACITY = 2;
export const MAX_CAPACITY = 12;
export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 12;
export const MAX_TITLE_LENGTH = 40;
export const MIN_STOPS = 2;
export const MAX_STOPS = 8;
/** 集合地点只保留一个（历史行程可能仍有多个，只读展示不报错）。 */
export const MAX_MEETING_AREAS = 1;

/** 难度强度：不新增后端字段，直接选中一个标签向同行者亮相（参考稿同行设置）。 */
export const DIFFICULTY_TAGS = ['轻松', '适中', '挑战'] as const;

/** 新表单默认难度：直接写进标签，下拉框显示的就是真正会提交的值。 */
export const DEFAULT_DIFFICULTY = '适中';

/** 发布表单的出行方式选项：自驾 / 骑行 / 公共交通。 */
export const TRIP_TRAVEL_MODES: readonly TripTravelMode[] = ['driving', 'bicycling', 'transit'];

export const TRIP_TRAVEL_MODE_LABELS: Record<TripTravelMode, string> = {
  driving: '自驾',
  bicycling: '骑行',
  transit: '公共交通',
};

/** 共享地图面板回传的是 `TravelMode`（含步行）；发布页用它收窄到三档。 */
export function isTripTravelMode(value: unknown): value is TripTravelMode {
  return value === 'driving' || value === 'bicycling' || value === 'transit';
}