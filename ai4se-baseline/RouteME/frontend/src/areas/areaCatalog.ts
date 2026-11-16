/**
 * 发布页可用目的地字典（省 → 市），与后端 `AreaConstant` 保持同一组 6 位代码。
 *
 * REQ-007 的全国字典由 `add-destination-area-filters` 提供；在此之前这里只覆盖
 * 灵感首页与存量种子实际使用的省市（广东 14 城 + 香港 / 澳门二级区），
 * 用来把发布链路先切到「代码为权威」。
 */

export type AreaCity = {
  code: string;
  name: string;
};

export type AreaProvince = {
  code: string;
  name: string;
  cities: AreaCity[];
};

export const AREA_PROVINCES: readonly AreaProvince[] = [
  {
    code: '440000',
    name: '广东省',
    cities: [
      { code: '440100', name: '广州' },
      { code: '440200', name: '韶关' },
      { code: '440300', name: '深圳' },
      { code: '440400', name: '珠海' },
      { code: '440500', name: '汕头' },
      { code: '440600', name: '佛山' },
      { code: '440700', name: '江门' },
      { code: '440800', name: '湛江' },
      { code: '441200', name: '肇庆' },
      { code: '441300', name: '惠州' },
      { code: '441700', name: '阳江' },
      { code: '441800', name: '清远' },
      { code: '441900', name: '东莞' },
      { code: '442000', name: '中山' },
    ],
  },
  {
    code: '810000',
    name: '香港',
    cities: [
      { code: '810100', name: '香港岛' },
      { code: '810200', name: '九龙' },
      { code: '810300', name: '新界' },
    ],
  },
  {
    code: '820000',
    name: '澳门',
    cities: [
      { code: '820100', name: '澳门半岛' },
      { code: '820200', name: '离岛' },
    ],
  },
] as const;

/** antd Cascader 的选项：必须选到第二级才算选定目的地。 */
export const DESTINATION_OPTIONS = AREA_PROVINCES.map((province) => ({
  value: province.code,
  label: province.name,
  children: province.cities.map((city) => ({ value: city.code, label: city.name })),
}));

export function cityByCode(code: string): AreaCity | undefined {
  for (const province of AREA_PROVINCES) {
    const city = province.cities.find((item) => item.code === code);
    if (city !== undefined) {
      return city;
    }
  }
  return undefined;
}

/** 详情页只返回市名，参考发布时据此还原 Cascader 的两级路径。 */
export function codesForCityName(name: string): [string, string] | undefined {
  const trimmed = name.trim();
  for (const province of AREA_PROVINCES) {
    const city = province.cities.find((item) => item.name === trimmed);
    if (city !== undefined) {
      return [province.code, city.code];
    }
  }
  return undefined;
}