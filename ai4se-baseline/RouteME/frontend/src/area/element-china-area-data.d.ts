declare module 'element-china-area-data/dist/app.commonjs.js' {
  export type RawAreaNode = {
    value: string;
    label: string;
    children?: RawAreaNode[];
  };

  export const provinceAndCityData: RawAreaNode[];
}
