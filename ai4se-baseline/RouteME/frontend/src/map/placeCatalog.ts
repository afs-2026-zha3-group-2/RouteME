/**
 * Offline place catalog for the schematic map.
 *
 * The demo must work without network access and without a map vendor key, so the
 * map is drawn from a fixed gazetteer of Guangdong cities and common travel POIs.
 * A typed place is only accepted when it resolves to one of these entries, which
 * is what makes "must be searchable on the map" verifiable offline.
 */

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

/** Projection bounds, chosen to cover Guangdong, Hong Kong, Macau and eastern Guangxi. */
export const MAP_BOUNDS = {
  minLng: 109.4,
  maxLng: 117.4,
  minLat: 20.0,
  maxLat: 26.0,
} as const;

const rawPlaces: Array<Omit<Place, 'id'>> = [
  // Cities
  { name: '珠海', city: '珠海', kind: 'city', lat: 22.27, lng: 113.58, aliases: ['珠海市', '香洲'] },
  { name: '广州', city: '广州', kind: 'city', lat: 23.13, lng: 113.26, aliases: ['广州市', '羊城'] },
  { name: '深圳', city: '深圳', kind: 'city', lat: 22.55, lng: 114.06, aliases: ['深圳市', '鹏城'] },
  { name: '佛山', city: '佛山', kind: 'city', lat: 23.03, lng: 113.12, aliases: ['佛山市'] },
  { name: '清远', city: '清远', kind: 'city', lat: 23.68, lng: 113.06, aliases: ['清远市'] },
  { name: '中山', city: '中山', kind: 'city', lat: 22.52, lng: 113.39, aliases: ['中山市'] },
  { name: '江门', city: '江门', kind: 'city', lat: 22.58, lng: 113.08, aliases: ['江门市'] },
  { name: '肇庆', city: '肇庆', kind: 'city', lat: 23.05, lng: 112.47, aliases: ['肇庆市'] },
  { name: '惠州', city: '惠州', kind: 'city', lat: 23.11, lng: 114.42, aliases: ['惠州市'] },
  { name: '东莞', city: '东莞', kind: 'city', lat: 23.02, lng: 113.75, aliases: ['东莞市'] },
  { name: '阳江', city: '阳江', kind: 'city', lat: 21.86, lng: 111.98, aliases: ['阳江市'] },
  { name: '湛江', city: '湛江', kind: 'city', lat: 21.27, lng: 110.36, aliases: ['湛江市'] },
  { name: '韶关', city: '韶关', kind: 'city', lat: 24.81, lng: 113.60, aliases: ['韶关市'] },
  { name: '汕头', city: '汕头', kind: 'city', lat: 23.35, lng: 116.68, aliases: ['汕头市'] },
  { name: '香港', city: '香港', kind: 'city', lat: 22.32, lng: 114.17, aliases: ['香港特别行政区', 'Hong Kong'] },
  { name: '澳门', city: '澳门', kind: 'city', lat: 22.19, lng: 113.55, aliases: ['澳门特别行政区', 'Macau'] },

  // Zhuhai
  { name: '香洲港', city: '珠海', kind: 'poi', lat: 22.29, lng: 113.60, aliases: ['香洲码头', '九洲港'] },
  { name: '情侣路', city: '珠海', kind: 'poi', lat: 22.26, lng: 113.58, aliases: ['情侣中路'] },
  { name: '珠海渔女', city: '珠海', kind: 'poi', lat: 22.26, lng: 113.59, aliases: ['渔女'] },
  { name: '日月贝', city: '珠海', kind: 'poi', lat: 22.28, lng: 113.60, aliases: ['珠海大剧院'] },
  { name: '圆明新园', city: '珠海', kind: 'poi', lat: 22.25, lng: 113.53, aliases: [] },
  { name: '外伶仃岛', city: '珠海', kind: 'poi', lat: 22.10, lng: 114.03, aliases: ['伶仃岛'] },
  { name: '东澳岛', city: '珠海', kind: 'poi', lat: 22.02, lng: 113.71, aliases: [] },
  { name: '港珠澳大桥', city: '珠海', kind: 'poi', lat: 22.20, lng: 113.85, aliases: ['大桥口岸'] },

  // Guangzhou
  { name: '广州塔', city: '广州', kind: 'poi', lat: 23.11, lng: 113.32, aliases: ['小蛮腰'] },
  { name: '沙面岛', city: '广州', kind: 'poi', lat: 23.11, lng: 113.24, aliases: ['沙面'] },
  { name: '永庆坊', city: '广州', kind: 'poi', lat: 23.12, lng: 113.24, aliases: ['恩宁路'] },
  { name: '白云山', city: '广州', kind: 'poi', lat: 23.18, lng: 113.30, aliases: [] },
  { name: '北京路', city: '广州', kind: 'poi', lat: 23.13, lng: 113.27, aliases: ['北京路步行街'] },
  { name: '陈家祠', city: '广州', kind: 'poi', lat: 23.13, lng: 113.24, aliases: ['陈家祠地铁站'] },

  // Shenzhen
  { name: '深圳湾公园', city: '深圳', kind: 'poi', lat: 22.51, lng: 113.95, aliases: ['深圳湾'] },
  { name: '大梅沙', city: '深圳', kind: 'poi', lat: 22.60, lng: 114.31, aliases: ['大梅沙海滨公园'] },
  { name: '世界之窗', city: '深圳', kind: 'poi', lat: 22.54, lng: 113.97, aliases: [] },
  { name: '梧桐山', city: '深圳', kind: 'poi', lat: 22.58, lng: 114.19, aliases: [] },
  { name: '前海石公园', city: '深圳', kind: 'poi', lat: 22.52, lng: 113.89, aliases: ['前海'] },

  // Foshan / Qingyuan / Zhongshan / Jiangmen / Zhaoqing
  { name: '佛山祖庙', city: '佛山', kind: 'poi', lat: 23.03, lng: 113.11, aliases: ['祖庙'] },
  { name: '岭南天地', city: '佛山', kind: 'poi', lat: 23.03, lng: 113.11, aliases: [] },
  { name: '西樵山', city: '佛山', kind: 'poi', lat: 22.93, lng: 112.98, aliases: [] },
  { name: '逢简水乡', city: '佛山', kind: 'poi', lat: 22.78, lng: 113.13, aliases: ['逢简'] },
  { name: '古龙峡', city: '清远', kind: 'poi', lat: 23.55, lng: 113.05, aliases: ['古龙峡漂流'] },
  { name: '连州地下河', city: '清远', kind: 'poi', lat: 24.78, lng: 112.38, aliases: ['地下河'] },
  { name: '孙中山故里', city: '中山', kind: 'poi', lat: 22.44, lng: 113.44, aliases: ['翠亨村'] },
  { name: '孙文西路', city: '中山', kind: 'poi', lat: 22.52, lng: 113.38, aliases: ['孙文西路步行街'] },
  { name: '开平碉楼', city: '江门', kind: 'poi', lat: 22.37, lng: 112.58, aliases: ['碉楼群'] },
  { name: '上下川岛', city: '江门', kind: 'poi', lat: 21.68, lng: 112.77, aliases: ['上川岛', '下川岛'] },
  { name: '七星岩', city: '肇庆', kind: 'poi', lat: 23.08, lng: 112.46, aliases: [] },
  { name: '鼎湖山', city: '肇庆', kind: 'poi', lat: 23.16, lng: 112.55, aliases: [] },

  // Huizhou / Yangjiang
  { name: '巽寮湾', city: '惠州', kind: 'poi', lat: 22.71, lng: 114.74, aliases: ['巽寮'] },
  { name: '双月湾', city: '惠州', kind: 'poi', lat: 22.57, lng: 114.89, aliases: [] },
  { name: '海陵岛', city: '阳江', kind: 'poi', lat: 21.58, lng: 111.85, aliases: ['闸坡'] },

  // Hong Kong / Macau
  { name: '维多利亚港', city: '香港', kind: 'poi', lat: 22.29, lng: 114.17, aliases: ['维港', '尖沙咀海滨'] },
  { name: '大三巴牌坊', city: '澳门', kind: 'poi', lat: 22.19, lng: 113.54, aliases: ['大三巴'] },
  { name: '官也街', city: '澳门', kind: 'poi', lat: 22.15, lng: 113.56, aliases: [] },
];

export const PLACES: Place[] = rawPlaces.map((place) => ({
  ...place,
  id: `${place.city}-${place.name}`,
}));

export const CITY_NAMES: string[] = PLACES.filter((place) => place.kind === 'city').map(
  (place) => place.name,
);

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

export type Point = { x: number; y: number };

/** Project lat/lng into the 0..100 SVG viewBox. */
export function projectLatLng(lat: number, lng: number): Point {
  const { minLng, maxLng, minLat, maxLat } = MAP_BOUNDS;
  return {
    x: ((lng - minLng) / (maxLng - minLng)) * 100,
    y: ((maxLat - lat) / (maxLat - minLat)) * 100,
  };
}

export function projectPlace(place: Place): Point {
  return projectLatLng(place.lat, place.lng);
}

/** Places that belong to one gazetteer city (POIs plus the city node itself). */
export function placesInCity(city: string): Place[] {
  return PLACES.filter((place) => place.city === city || place.name === city);
}

/** Inverse of {@link projectLatLng}; used by map click handling and tests. */
export function unprojectPoint(point: Point): { lat: number; lng: number } {
  const { minLng, maxLng, minLat, maxLat } = MAP_BOUNDS;
  return {
    lng: minLng + (point.x / 100) * (maxLng - minLng),
    lat: maxLat - (point.y / 100) * (maxLat - minLat),
  };
}

export type NearestPlace = { place: Place; distance: number };

/** Nearest catalog entry to a projected point, plus distance in viewBox units. */
export function nearestPlace(point: Point): NearestPlace {
  const first = PLACES[0];
  let best: NearestPlace = { place: first, distance: Number.POSITIVE_INFINITY };
  for (const place of PLACES) {
    const projected = projectPlace(place);
    const distance = Math.hypot(projected.x - point.x, projected.y - point.y);
    if (distance < best.distance) {
      best = { place, distance };
    }
  }
  return best;
}

/** Rough Guangdong landmass outline, projected from the coordinates above. */
const LAND_OUTLINE: Array<[number, number]> = [
  [109.7, 24.9],
  [110.2, 25.4],
  [111.6, 25.5],
  [113.2, 25.4],
  [114.7, 25.1],
  [115.8, 25.3],
  [116.8, 24.9],
  [117.2, 24.2],
  [116.9, 23.6],
  [116.5, 23.2],
  [115.6, 22.9],
  [114.4, 22.7],
  [113.9, 22.5],
  [113.75, 22.1],
  [113.4, 21.9],
  [112.9, 21.7],
  [112.3, 21.6],
  [111.5, 21.4],
  [110.6, 21.2],
  [110.2, 21.5],
  [109.8, 22.2],
  [109.7, 23.2],
];

export const LAND_PATH = (() => {
  const commands = LAND_OUTLINE.map(([lng, lat], index) => {
    const point = projectLatLng(lat, lng);
    return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  });
  return `${commands.join(' ')} Z`;
})();

/** Small islands so the outline reads as a coastline rather than a polygon. */
export const ISLANDS: Array<{ x: number; y: number; r: number }> = PLACES.filter(
  (place) => place.kind === 'poi' && /岛$/.test(place.name),
).map((place) => {
  const point = projectPlace(place);
  return { x: Number(point.x.toFixed(2)), y: Number(point.y.toFixed(2)), r: 1.6 };
});