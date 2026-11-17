/**
 * 三级地图静态轻量索引（refine-trip-map R2 / design D16）。
 *
 * 只含名称/别名/城市归属/局部坐标/公里标定，不含道路、水域、公园、同行者等
 * 重数据（那些按城懒加载，见 cities/registry.ts）。搜索与校验以本索引为权威，
 * PlacePicker facade（placeCatalog.ts）同源 re-export，保证「必须能在地图上搜到」
 * 的离线语义在三级架构下不变。
 *
 * 坐标口径：Poi.x/y 为城市局部 0..100 viewBox；kmPerX/kmPerY 为该城每 viewBox
 * 单位对应的公里数（距离/时长「预计」估算用，见 routeEstimate.ts）。
 */

import type { CityIndex, Point, Poi } from './types';

export type { CityIndex, Poi, Point } from './types';

/** 旧省级投影边界（facade 兼容口径；distanceKm 仍走真实经纬度投影）。 */
export const MAP_BOUNDS = {
  minLng: 109.4,
  maxLng: 117.4,
  minLat: 20.0,
  maxLat: 26.0,
} as const;

export function projectLatLng(lat: number, lng: number): Point {
  const { minLng, maxLng, minLat, maxLat } = MAP_BOUNDS;
  return {
    x: ((lng - minLng) / (maxLng - minLng)) * 100,
    y: ((maxLat - lat) / (maxLat - minLat)) * 100,
  };
}

export function unprojectPoint(point: Point): { lat: number; lng: number } {
  const { minLng, maxLng, minLat, maxLat } = MAP_BOUNDS;
  return {
    lng: minLng + (point.x / 100) * (maxLng - minLng),
    lat: maxLat - (point.y / 100) * (maxLat - minLat),
  };
}

type RawPoi = { name: string; aliases: string[]; lat: number; lng: number; kind?: 'poi' | 'park'; desc?: string };
type RawCity = {
  code: string;
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  pois: RawPoi[];
};

/**
 * legacy 广东城市转换：把旧 catalog 的经纬度线性铺满 22..78 局部视口
 * （与 R1 cityProjection 同口径，span 下限 0.04° 防除零），名称/别名原样保留
 * 以兼容既有 e2e 手输校验。城市中心取点位包围盒中点，lat/lng 可精确往返。
 */
function fromLegacy(raw: RawCity): CityIndex {
  const points = [{ lat: raw.lat, lng: raw.lng }, ...raw.pois];
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, 0.04);
  const spanLng = Math.max(maxLng - minLng, 0.04);
  const min = 22;
  const side = 56;
  const kmPerX = (spanLng * 102.5) / side;
  const kmPerY = (spanLat * 111) / side;
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const pois: Poi[] = raw.pois.map((poi) => ({
    id: `${raw.name}-${poi.name}`,
    name: poi.name,
    aliases: poi.aliases,
    kind: poi.kind ?? 'poi',
    x: Number((min + ((poi.lng - minLng) / spanLng) * side).toFixed(2)),
    y: Number((min + ((maxLat - poi.lat) / spanLat) * side).toFixed(2)),
    desc: poi.desc,
  }));
  return {
    code: raw.code,
    name: raw.name,
    aliases: raw.aliases,
    provinceCode: raw.code.startsWith('81') ? '810000' : raw.code.startsWith('82') ? '820000' : '440000',
    provinceName: raw.code.startsWith('81') ? '香港' : raw.code.startsWith('82') ? '澳门' : '广东',
    centerLat,
    centerLng,
    kmPerX,
    kmPerY,
    pois,
  };
}

/** 手工城市：POI 直接给局部坐标；lat/lng 由中心点＋公里标定反推（facade 兼容）。 */
function handCity(
  meta: Omit<CityIndex, 'pois'>,
  pois: Array<Omit<Poi, 'id'> & { id?: string }>,
): CityIndex {
  return {
    ...meta,
    pois: pois.map((poi) => ({ ...poi, id: poi.id ?? `${meta.name}-${poi.name}` })),
  };
}

/** 广州：主 Demo，手工布局（珠江新城轴线＋老城西部），完成度最高。 */
const GUANGZHOU = handCity(
  {
    code: '440100',
    name: '广州',
    aliases: ['广州市', '羊城'],
    provinceCode: '440000',
    provinceName: '广东',
    centerLat: 23.13,
    centerLng: 113.28,
    kmPerX: 0.23,
    kmPerY: 0.2,
  },
  [
    { name: '白云山', aliases: [], kind: 'park', x: 52, y: 14, desc: '羊城第一秀，登高俯瞰全城' },
    { name: '越秀公园', aliases: [], kind: 'park', x: 44, y: 30, desc: '五羊石像与镇海楼所在地' },
    { name: '陈家祠', aliases: ['陈家祠地铁站'], kind: 'poi', x: 34, y: 42, desc: '岭南建筑装饰艺术博物馆' },
    { name: '永庆坊', aliases: ['恩宁路'], kind: 'poi', x: 28, y: 48, desc: '恩宁路骑楼老街微改造' },
    { name: '沙面岛', aliases: ['沙面'], kind: 'poi', x: 30, y: 57, desc: '珠江边的欧陆风情建筑群' },
    { name: '北京路', aliases: ['北京路步行街'], kind: 'poi', x: 47, y: 46, desc: '千年商都步行街与古道遗址' },
    { name: '花城广场', aliases: [], kind: 'poi', x: 57, y: 55, desc: '珠江新城城市中轴线客厅' },
    { name: '广东省博物馆', aliases: [], kind: 'poi', x: 63, y: 57, desc: '月光宝盒造型的省级博物馆' },
    { name: '海心沙', aliases: [], kind: 'poi', x: 57, y: 63, desc: '珠江江心岛，亚运开幕场地' },
    { name: '广州大剧院', aliases: [], kind: 'poi', x: 62, y: 66, desc: '扎哈·哈迪德设计的圆润双砾' },
    { name: '广州塔', aliases: ['小蛮腰'], kind: 'poi', x: 57, y: 71, desc: '600 米城市地标，珠江南岸' },
  ],
);

const BEIJING = handCity(
  { code: '110100', name: '北京', aliases: ['北京市', '帝都'], provinceCode: '110000', provinceName: '北京', centerLat: 39.9, centerLng: 116.4, kmPerX: 0.45, kmPerY: 0.4 },
  [
    { name: '故宫', aliases: ['紫禁城'], kind: 'poi', x: 50, y: 42, desc: '明清两代皇家宫殿' },
    { name: '天坛', aliases: [], kind: 'poi', x: 58, y: 68, desc: '祈年殿与回音壁' },
    { name: '颐和园', aliases: [], kind: 'park', x: 24, y: 22, desc: '昆明湖与万寿山皇家园林' },
    { name: '南锣鼓巷', aliases: [], kind: 'poi', x: 56, y: 34, desc: '胡同文创与小吃' },
    { name: '什刹海', aliases: ['后海'], kind: 'poi', x: 46, y: 32, desc: '湖畔酒吧与胡同漫步' },
    { name: '奥林匹克公园', aliases: ['鸟巢'], kind: 'park', x: 52, y: 14, desc: '鸟巢与水立方' },
  ],
);

const SHANGHAI = handCity(
  { code: '310100', name: '上海', aliases: ['上海市', '魔都'], provinceCode: '310000', provinceName: '上海', centerLat: 31.23, centerLng: 121.47, kmPerX: 0.3, kmPerY: 0.28 },
  [
    { name: '外滩', aliases: [], kind: 'poi', x: 58, y: 44, desc: '万国建筑博览群与江景' },
    { name: '陆家嘴', aliases: [], kind: 'poi', x: 66, y: 46, desc: '东方明珠与三件套天际线' },
    { name: '南京路步行街', aliases: ['南京路'], kind: 'poi', x: 50, y: 42, desc: '中华商业第一街' },
    { name: '豫园', aliases: [], kind: 'poi', x: 56, y: 54, desc: '江南古典园林与城隍庙' },
    { name: '武康路', aliases: [], kind: 'poi', x: 38, y: 56, desc: '梧桐区历史风貌街区' },
    { name: '田子坊', aliases: [], kind: 'poi', x: 48, y: 62, desc: '石库门里弄文创园' },
  ],
);

const CHENGDU = handCity(
  { code: '510100', name: '成都', aliases: ['成都市', '蓉城'], provinceCode: '510000', provinceName: '四川', centerLat: 30.66, centerLng: 104.06, kmPerX: 0.25, kmPerY: 0.24 },
  [
    { name: '宽窄巷子', aliases: [], kind: 'poi', x: 42, y: 40, desc: '清代少城胡同院落' },
    { name: '春熙路', aliases: [], kind: 'poi', x: 56, y: 44, desc: '太古里与 IFS 爬墙熊猫' },
    { name: '杜甫草堂', aliases: [], kind: 'park', x: 30, y: 50, desc: '诗圣故居与竹林' },
    { name: '锦里', aliases: [], kind: 'poi', x: 40, y: 56, desc: '三国文化民俗街' },
    { name: '武侯祠', aliases: [], kind: 'poi', x: 42, y: 60, desc: '君臣合祀祠庙' },
    { name: '大熊猫基地', aliases: ['熊猫基地'], kind: 'park', x: 62, y: 16, desc: '近距离看国宝' },
  ],
);

const CHONGQING = handCity(
  { code: '500100', name: '重庆', aliases: ['重庆市', '山城'], provinceCode: '500000', provinceName: '重庆', centerLat: 29.56, centerLng: 106.55, kmPerX: 0.25, kmPerY: 0.24 },
  [
    { name: '洪崖洞', aliases: [], kind: 'poi', x: 54, y: 46, desc: '吊脚楼夜景与千与千寻同款' },
    { name: '解放碑', aliases: [], kind: 'poi', x: 58, y: 50, desc: '抗战胜利纪功碑商圈' },
    { name: '长江索道', aliases: [], kind: 'poi', x: 60, y: 58, desc: '跨江空中巴士' },
    { name: '鹅岭公园', aliases: [], kind: 'park', x: 44, y: 52, desc: '两江夜景瞰胜楼' },
    { name: '磁器口', aliases: [], kind: 'poi', x: 26, y: 42, desc: '嘉陵江边千年古镇' },
  ],
);

const HANGZHOU = handCity(
  { code: '330100', name: '杭州', aliases: ['杭州市', '临安'], provinceCode: '330000', provinceName: '浙江', centerLat: 30.25, centerLng: 120.16, kmPerX: 0.3, kmPerY: 0.28 },
  [
    { name: '西湖', aliases: [], kind: 'park', x: 40, y: 50, desc: '断桥残雪与苏堤春晓' },
    { name: '雷峰塔', aliases: [], kind: 'poi', x: 42, y: 62, desc: '白蛇传传说地标' },
    { name: '灵隐寺', aliases: [], kind: 'poi', x: 22, y: 44, desc: '千年古刹与飞来峰' },
    { name: '河坊街', aliases: [], kind: 'poi', x: 52, y: 56, desc: '南宋御街民俗小吃' },
    { name: '西溪湿地', aliases: [], kind: 'park', x: 20, y: 28, desc: '城市湿地公园' },
  ],
);

const XIAN = handCity(
  { code: '610100', name: '西安', aliases: ['西安市', '长安'], provinceCode: '610000', provinceName: '陕西', centerLat: 34.26, centerLng: 108.94, kmPerX: 0.35, kmPerY: 0.32 },
  [
    { name: '西安城墙', aliases: ['城墙'], kind: 'poi', x: 50, y: 42, desc: '明代城垣骑行环线' },
    { name: '回民街', aliases: [], kind: 'poi', x: 46, y: 40, desc: '鼓楼后美食街区' },
    { name: '大雁塔', aliases: [], kind: 'poi', x: 56, y: 62, desc: '玄奘译经塔与音乐喷泉' },
    { name: '陕西历史博物馆', aliases: ['陕历博'], kind: 'poi', x: 54, y: 56, desc: '古都明珠华夏宝库' },
    { name: '兵马俑', aliases: ['秦始皇兵马俑'], kind: 'poi', x: 78, y: 30, desc: '世界第八大奇迹' },
  ],
);

const NANJING = handCity(
  { code: '320100', name: '南京', aliases: ['南京市', '金陵'], provinceCode: '320000', provinceName: '江苏', centerLat: 32.06, centerLng: 118.8, kmPerX: 0.3, kmPerY: 0.28 },
  [
    { name: '玄武湖', aliases: [], kind: 'park', x: 52, y: 30, desc: '金陵明珠皇家园林湖泊' },
    { name: '鸡鸣寺', aliases: [], kind: 'poi', x: 52, y: 38, desc: '南朝第一寺' },
    { name: '总统府', aliases: [], kind: 'poi', x: 56, y: 46, desc: '近代史遗址博物馆' },
    { name: '夫子庙', aliases: [], kind: 'poi', x: 50, y: 58, desc: '秦淮河夜景与科举博物馆' },
    { name: '中山陵', aliases: [], kind: 'poi', x: 70, y: 38, desc: '紫金山麓伟人陵寝' },
  ],
);

const SUZHOU = handCity(
  { code: '320500', name: '苏州', aliases: ['苏州市', '姑苏'], provinceCode: '320000', provinceName: '江苏', centerLat: 31.3, centerLng: 120.62, kmPerX: 0.25, kmPerY: 0.24 },
  [
    { name: '拙政园', aliases: [], kind: 'park', x: 54, y: 34, desc: '江南园林之首' },
    { name: '苏州博物馆', aliases: ['苏博'], kind: 'poi', x: 52, y: 38, desc: '贝聿铭封山之作' },
    { name: '平江路', aliases: [], kind: 'poi', x: 58, y: 40, desc: '水巷并行历史街区' },
    { name: '山塘街', aliases: [], kind: 'poi', x: 42, y: 30, desc: '七里山塘到虎丘' },
    { name: '金鸡湖', aliases: [], kind: 'park', x: 76, y: 52, desc: '园区现代湖景与摩天轮' },
  ],
);

/** legacy 广东城市＋港澳＋深圳：旧 catalog 经纬度原样转换，名称/别名保留。 */
const LEGACY_RAW: RawCity[] = [
  {
    code: '440300', name: '深圳', aliases: ['深圳市', '鹏城'], lat: 22.55, lng: 114.06,
    pois: [
      { name: '深圳湾公园', aliases: ['深圳湾'], lat: 22.51, lng: 113.95 },
      { name: '大梅沙', aliases: ['大梅沙海滨公园'], lat: 22.6, lng: 114.31 },
      { name: '世界之窗', aliases: [], lat: 22.54, lng: 113.97 },
      { name: '梧桐山', aliases: [], lat: 22.58, lng: 114.19, kind: 'park' },
      { name: '前海石公园', aliases: ['前海'], lat: 22.52, lng: 113.89 },
    ],
  },
  {
    code: '440400', name: '珠海', aliases: ['珠海市', '香洲'], lat: 22.27, lng: 113.58,
    pois: [
      { name: '香洲港', aliases: ['香洲码头', '九洲港'], lat: 22.29, lng: 113.6 },
      { name: '情侣路', aliases: ['情侣中路'], lat: 22.26, lng: 113.58 },
      { name: '珠海渔女', aliases: ['渔女'], lat: 22.26, lng: 113.59 },
      { name: '日月贝', aliases: ['珠海大剧院'], lat: 22.28, lng: 113.6 },
      { name: '圆明新园', aliases: [], lat: 22.25, lng: 113.53 },
      { name: '外伶仃岛', aliases: ['伶仃岛'], lat: 22.1, lng: 114.03 },
      { name: '东澳岛', aliases: [], lat: 22.02, lng: 113.71 },
      { name: '港珠澳大桥', aliases: ['大桥口岸'], lat: 22.2, lng: 113.85 },
    ],
  },
  {
    code: '440600', name: '佛山', aliases: ['佛山市'], lat: 23.03, lng: 113.12,
    pois: [
      { name: '佛山祖庙', aliases: ['祖庙'], lat: 23.03, lng: 113.11 },
      { name: '岭南天地', aliases: [], lat: 23.03, lng: 113.11 },
      { name: '西樵山', aliases: [], lat: 22.93, lng: 112.98, kind: 'park' },
      { name: '逢简水乡', aliases: ['逢简'], lat: 22.78, lng: 113.13 },
    ],
  },
  { code: '441900', name: '东莞', aliases: ['东莞市'], lat: 23.02, lng: 113.75, pois: [] },
  {
    code: '441800', name: '清远', aliases: ['清远市'], lat: 23.68, lng: 113.06,
    pois: [
      { name: '古龙峡', aliases: ['古龙峡漂流'], lat: 23.55, lng: 113.05 },
      { name: '连州地下河', aliases: ['地下河'], lat: 24.78, lng: 112.38 },
    ],
  },
  {
    code: '442000', name: '中山', aliases: ['中山市'], lat: 22.52, lng: 113.39,
    pois: [
      { name: '孙中山故里', aliases: ['翠亨村'], lat: 22.44, lng: 113.44 },
      { name: '孙文西路', aliases: ['孙文西路步行街'], lat: 22.52, lng: 113.38 },
    ],
  },
  {
    code: '440700', name: '江门', aliases: ['江门市'], lat: 22.58, lng: 113.08,
    pois: [
      { name: '开平碉楼', aliases: ['碉楼群'], lat: 22.37, lng: 112.58 },
      { name: '上下川岛', aliases: ['上川岛', '下川岛'], lat: 21.68, lng: 112.77 },
    ],
  },
  {
    code: '441200', name: '肇庆', aliases: ['肇庆市'], lat: 23.05, lng: 112.47,
    pois: [
      { name: '七星岩', aliases: [], lat: 23.08, lng: 112.46 },
      { name: '鼎湖山', aliases: [], lat: 23.16, lng: 112.55, kind: 'park' },
    ],
  },
  {
    code: '441300', name: '惠州', aliases: ['惠州市'], lat: 23.11, lng: 114.42,
    pois: [
      { name: '巽寮湾', aliases: ['巽寮'], lat: 22.71, lng: 114.74 },
      { name: '双月湾', aliases: [], lat: 22.57, lng: 114.89 },
    ],
  },
  {
    code: '441700', name: '阳江', aliases: ['阳江市'], lat: 21.86, lng: 111.98,
    pois: [{ name: '海陵岛', aliases: ['闸坡'], lat: 21.58, lng: 111.85 }],
  },
  { code: '440800', name: '湛江', aliases: ['湛江市'], lat: 21.27, lng: 110.36, pois: [] },
  { code: '440200', name: '韶关', aliases: ['韶关市'], lat: 24.81, lng: 113.6, pois: [] },
  { code: '440500', name: '汕头', aliases: ['汕头市'], lat: 23.35, lng: 116.68, pois: [] },
  {
    code: '810000', name: '香港', aliases: ['香港特别行政区', 'Hong Kong'], lat: 22.32, lng: 114.17,
    pois: [{ name: '维多利亚港', aliases: ['维港', '尖沙咀海滨'], lat: 22.29, lng: 114.17 }],
  },
  {
    code: '820000', name: '澳门', aliases: ['澳门特别行政区', 'Macau'], lat: 22.19, lng: 113.55,
    pois: [
      { name: '大三巴牌坊', aliases: ['大三巴'], lat: 22.19, lng: 113.54 },
      { name: '官也街', aliases: [], lat: 22.15, lng: 113.56 },
    ],
  },
];

/** 全量城市索引：10 MVP 城（广州手工最高完成度）＋legacy 广东/港澳转换。 */
export const CITY_INDEX: CityIndex[] = [
  GUANGZHOU,
  BEIJING,
  SHANGHAI,
  CHENGDU,
  CHONGQING,
  HANGZHOU,
  XIAN,
  NANJING,
  SUZHOU,
  ...LEGACY_RAW.map(fromLegacy),
];

const byCode = new Map(CITY_INDEX.map((city) => [city.code, city]));
const byName = new Map<string, CityIndex>();
for (const city of CITY_INDEX) {
  for (const key of [city.name, ...city.aliases]) {
    byName.set(key.trim().toLowerCase(), city);
  }
}

export function cityIndexByCode(code?: string): CityIndex | undefined {
  if (code === undefined || code === '') {
    return undefined;
  }
  const direct = byCode.get(code);
  if (direct !== undefined) {
    return direct;
  }
  // 港澳台二级区代码（810001…/820001…）共用「香港」「澳门」索引。
  if (code.startsWith('81')) {
    return byCode.get('810000');
  }
  if (code.startsWith('82')) {
    return byCode.get('820000');
  }
  return undefined;
}

export function cityIndexByName(value: string): CityIndex | undefined {
  const query = value.trim().toLowerCase().replace(/市$/, '');
  return byName.get(query) ?? byName.get(value.trim().toLowerCase());
}

export function citiesInProvince(provinceCode: string): CityIndex[] {
  return CITY_INDEX.filter((city) => city.provinceCode === provinceCode);
}

export function findPoi(cityCode: string, poiId: string): Poi | undefined {
  return cityIndexByCode(cityCode)?.pois.find((poi) => poi.id === poiId);
}

/* ------------------------------------------------------------------ */
/* facade 兼容层：旧 Place 口径（lat/lng），供 placeCatalog re-export。  */
/* ------------------------------------------------------------------ */

export type PlaceKind = 'city' | 'poi';

export type Place = {
  id: string;
  name: string;
  city: string;
  kind: PlaceKind;
  lat: number;
  lng: number;
  aliases: string[];
};

/** POI 局部坐标 → 经纬度（中心点＋公里标定线性反推；legacy 城可精确往返）。 */
export function poiLatLng(city: CityIndex, poi: Poi): { lat: number; lng: number } {
  return {
    lat: city.centerLat + ((50 - poi.y) * city.kmPerY) / 111,
    lng: city.centerLng + ((poi.x - 50) * city.kmPerX) / 102.5,
  };
}

function buildPlaces(): Place[] {
  const places: Place[] = [];
  for (const city of CITY_INDEX) {
    places.push({
      id: `${city.name}-${city.name}`,
      name: city.name,
      city: city.name,
      kind: 'city',
      lat: city.centerLat,
      lng: city.centerLng,
      aliases: city.aliases,
    });
    for (const poi of city.pois) {
      const { lat, lng } = poiLatLng(city, poi);
      places.push({ id: poi.id, name: poi.name, city: city.name, kind: 'poi', lat, lng, aliases: poi.aliases });
    }
  }
  return places;
}

export const PLACES: Place[] = buildPlaces();

export const CITY_NAMES: string[] = CITY_INDEX.map((city) => city.name);

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

/** Exact lookup by display name or alias. Used to validate manually typed places. */
export function findPlaceByName(value: string): Place | undefined {
  const query = normalize(value);
  if (query === '') {
    return undefined;
  }
  return PLACES.find(
    (place) =>
      normalize(place.name) === query || place.aliases.some((alias) => normalize(alias) === query),
  );
}

export type PlaceSearchOptions = {
  kinds?: PlaceKind[];
  limit?: number;
};

/** Ranked prefix/substring search; exact names and aliases rank first. */
export function searchPlaces(query: string, options: PlaceSearchOptions = {}): Place[] {
  const { kinds, limit = 8 } = options;
  const needle = normalize(query);
  if (needle === '') {
    return [];
  }
  const scoped = kinds === undefined ? PLACES : PLACES.filter((place) => kinds.includes(place.kind));
  const scored: Array<{ place: Place; score: number }> = [];
  for (const place of scoped) {
    const name = normalize(place.name);
    const aliases = place.aliases.map(normalize);
    let score = 0;
    if (name === needle || aliases.includes(needle)) {
      score = 100;
    } else if (name.startsWith(needle) || aliases.some((alias) => alias.startsWith(needle))) {
      score = 70;
    } else if (name.includes(needle) || aliases.some((alias) => alias.includes(needle))) {
      score = 45;
    } else if (normalize(place.city).includes(needle)) {
      score = 25;
    }
    if (score > 0) {
      scored.push({ place, score: score + (place.kind === 'city' ? 3 : 0) });
    }
  }
  scored.sort((left, right) => right.score - left.score || left.place.name.length - right.place.name.length);
  return scored.slice(0, limit).map((entry) => entry.place);
}

/** Resolve typed text to a place, or undefined when the gazetteer cannot find it. */
export function resolvePlace(value: string, kinds?: PlaceKind[]): Place | undefined {
  const scoped = kinds === undefined ? PLACES : PLACES.filter((place) => kinds.includes(place.kind));
  const query = normalize(value);
  if (query === '') {
    return undefined;
  }
  const exact = scoped.find(
    (place) =>
      normalize(place.name) === query || place.aliases.some((alias) => normalize(alias) === query),
  );
  if (exact !== undefined) {
    return exact;
  }
  return searchPlaces(value, { kinds, limit: 1 })[0];
}

export function projectPlace(place: Place): Point {
  return projectLatLng(place.lat, place.lng);
}

/** Places that belong to one gazetteer city (POIs plus the city node itself). */
export function placesInCity(city: string): Place[] {
  return PLACES.filter((place) => place.city === city);
}

export type NearestPlace = { place: Place; distance: number };

/** 距投影点最近的 limit 个地名库条目，按距离升序（候选浮层用）。 */
export function nearestPlaces(
  point: Point,
  limit = 3,
  pool: Place[] = PLACES,
  project: (place: Place) => Point = projectPlace,
): NearestPlace[] {
  return pool
    .map((place) => ({ place, distance: Math.hypot(project(place).x - point.x, project(place).y - point.y) }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, limit);
}