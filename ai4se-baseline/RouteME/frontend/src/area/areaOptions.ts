import { provinceAndCityData } from 'element-china-area-data/dist/app.commonjs.js';

export type AreaOption = {
  value: string;
  label: string;
  children?: AreaOption[];
};

export type AreaCity = {
  provinceCode: string;
  provinceName: string;
  provinceDisplayName: string;
  cityCode: string;
  cityName: string;
  cityDisplayName: string;
};

const MUNICIPALITIES = new Set(['110000', '120000', '310000', '500000']);
const SPECIAL = new Set(['710000', '810000', '820000']);

function provinceDisplayName(code: string, name: string): string {
  if (!SPECIAL.has(code)) {
    return name;
  }
  return name.replace('特别行政区', '').replace('省', '');
}

const cityByCode = new Map<string, AreaCity>();

export const AREA_OPTIONS: AreaOption[] = provinceAndCityData.map((province) => {
  const municipality = MUNICIPALITIES.has(province.value);
  const provinceLabel = provinceDisplayName(province.value, province.label);
  const children = (province.children ?? []).map((city) => {
    const cityLabel = municipality ? province.label : city.label;
    cityByCode.set(city.value, {
      provinceCode: province.value,
      provinceName: province.label,
      provinceDisplayName: provinceLabel,
      cityCode: city.value,
      cityName: cityLabel,
      cityDisplayName: cityLabel,
    });
    return { value: city.value, label: cityLabel };
  });
  return { value: province.value, label: province.label, children };
});

export function findCity(code?: string): AreaCity | undefined {
  return code === undefined || code === '' ? undefined : cityByCode.get(code);
}

export function cascaderValueOf(code?: string): string[] {
  const city = findCity(code);
  return city === undefined ? [] : [city.provinceCode, city.cityCode];
}

/**
 * 摘要/详情口径：普通省「广东省 / 珠海市」；直辖市「北京市」；港澳台「香港 · 中西區」。
 */
export function destinationLabel(code?: string): string {
  const city = findCity(code);
  if (city === undefined) {
    return '';
  }
  if (city.provinceCode === city.cityCode || MUNICIPALITIES.has(city.provinceCode)) {
    return city.cityDisplayName;
  }
  if (SPECIAL.has(city.provinceCode)) {
    return `${city.provinceDisplayName} · ${city.cityDisplayName}`;
  }
  return `${city.provinceDisplayName} / ${city.cityDisplayName}`;
}

/**
 * 卡片口径：只显示市名；直辖市显示省级名；港澳台显示「省 · 二级」。
 */
export function cityLabel(code?: string): string {
  const city = findCity(code);
  if (city === undefined) {
    return '';
  }
  if (MUNICIPALITIES.has(city.provinceCode)) {
    return city.provinceDisplayName;
  }
  if (SPECIAL.has(city.provinceCode)) {
    return `${city.provinceDisplayName} · ${city.cityDisplayName}`;
  }
  return city.cityDisplayName;
}
