const fs = require('node:fs');
const path = require('node:path');
const { provinceAndCityData } = require('element-china-area-data/dist/app.commonjs.js');

const MUNICIPALITIES = new Set(['110000', '120000', '310000', '500000']);
const SPECIAL = new Set(['710000', '810000', '820000']);

function provinceDisplayName(code, name) {
  if (!SPECIAL.has(code)) {
    return name;
  }
  return name.replace('特别行政区', '').replace('省', '');
}

const provinces = provinceAndCityData.map((province) => ({
  code: province.value,
  name: province.label,
  displayName: provinceDisplayName(province.value, province.label),
  cities: (province.children ?? []).map((city) => ({
    code: city.value,
    name: MUNICIPALITIES.has(province.value) ? province.label : city.label,
    displayName: MUNICIPALITIES.has(province.value) ? province.label : city.label,
  })),
}));

const out = path.resolve(__dirname, '../../backend/src/main/resources/area/area-codes.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify({ provinces }, null, 2)}\n`, 'utf8');
const cityCount = provinces.reduce((total, province) => total + province.cities.length, 0);
console.log(`wrote ${out}: ${provinces.length} provinces, ${cityCount} cities`);
