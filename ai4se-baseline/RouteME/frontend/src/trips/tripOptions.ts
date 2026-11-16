import { CITY_NAMES } from '../map/placeCatalog';

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