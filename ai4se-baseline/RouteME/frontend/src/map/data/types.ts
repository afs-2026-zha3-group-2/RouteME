/** 三级地图数据契约（refine-trip-map R2 / design D16）。 */

export type Point = { x: number; y: number };

export type PoiKind = 'poi' | 'park';

/** 城市局部坐标（0..100）下的景点索引条目；静态轻量索引成员。 */
export type Poi = {
  id: string;
  name: string;
  aliases: string[];
  kind: PoiKind;
  x: number;
  y: number;
  desc?: string;
};

/** 静态轻量索引：名称/别名/城市/坐标/公里标定；不含道路/水域/公园/同行者重数据。 */
export type CityIndex = {
  code: string;
  name: string;
  aliases: string[];
  provinceCode: string;
  provinceName: string;
  /** 城市中心经纬度（facade 兼容口径与省级布局锚点）。 */
  centerLat: number;
  centerLng: number;
  kmPerX: number;
  kmPerY: number;
  pois: Poi[];
};

export type Road = { x1: number; y1: number; x2: number; y2: number; major?: boolean };
export type WaterBand = { path: string; width: number };
export type ParkBlock = { x: number; y: number; w: number; h: number };
export type District = { name: string; x: number; y: number };

/** 城市重数据：按城懒加载（registry 动态 import）。 */
export type CityLayers = {
  roads: Road[];
  water: WaterBand[];
  parks: ParkBlock[];
  districts: District[];
};

export type Traveler = {
  id: string;
  name: string;
  age: number;
  homeCity: string;
  /** 引用真实演示用户时提供，用于「查看资料」。 */
  userId?: number;
  /** 引用真实行程时提供，用于「发起同行邀请」跳申请入口。 */
  tripId?: number;
  tags: string[];
  dateRange: [string, string];
  /** 旅行者路线的 POI id 集合（重合度计算来源）。 */
  route: string[];
};

export type CityMapData = {
  layers: CityLayers;
  travelers: Traveler[];
};

/** 中国地图省级单元（离线简化低多边形）。 */
export type ProvinceShape = {
  code: string;
  name: string;
  points: Point[];
  label: Point;
};