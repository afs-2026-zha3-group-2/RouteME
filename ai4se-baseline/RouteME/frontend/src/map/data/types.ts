/** 离线地名词典数据契约（三级 SVG 地图退役后只保留轻量索引口径）。 */

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