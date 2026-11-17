/**
 * 旅行地图探索页（refine-trip-map R2 / design D14）。
 *
 * 按路由渲染 ChinaMap / ProvinceMap / CityTravelMap 之一（独立组件切换，
 * 非同一 SVG zoom）；URL 为层级唯一权威：#/map → #/map/{省} → #/map/{省}/{市}。
 * 探索状态：selectedPois（有序）、routeGenerated；换城重置。
 */

import { useEffect, useState } from 'react';
import { Typography, message } from 'antd';
import { ChinaMap } from '../map/ChinaMap';
import { ProvinceMap } from '../map/ProvinceMap';
import { CityTravelMap } from '../map/CityTravelMap';
import { cityIndexByCode } from '../map/data/index';
import type { Poi } from '../map/data/types';
import { findCity } from '../area/areaOptions';
import { routeToHash } from '../route';
import { MAX_STOPS } from '../trips/tripOptions';

/** 与发布途经点上限同口径（tripOptions.MAX_STOPS）。 */
const MAX_ROUTE_POIS = MAX_STOPS;

type Props = {
  provinceCode?: string;
  cityCode?: string;
};

export function MapExplorerPage({ provinceCode, cityCode }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [routeGenerated, setRouteGenerated] = useState(false);
  const [focusPoiId, setFocusPoiId] = useState<string | null>(null);

  // 换城清空探索状态，避免跨城残留编号/路线。
  useEffect(() => {
    setSelected([]);
    setRouteGenerated(false);
    setFocusPoiId(null);
  }, [cityCode]);

  const goto = (hash: string) => {
    window.location.hash = hash;
  };

  const togglePoi = (poi: Poi) => {
    setSelected((previous) => {
      if (previous.includes(poi.id)) {
        const next = previous.filter((id) => id !== poi.id);
        if (next.length < 2) {
          setRouteGenerated(false);
        }
        return next;
      }
      if (previous.length >= MAX_ROUTE_POIS) {
        message.warning(`最多选择 ${MAX_ROUTE_POIS} 个景点`);
        return previous;
      }
      return [...previous, poi.id];
    });
  };

  const generate = () => {
    if (selected.length >= 2) {
      setRouteGenerated(true);
    }
  };

  let content;
  if (provinceCode === undefined) {
    content = (
      <ChinaMap
        onSelectProvince={(code) => goto(routeToHash({ name: 'map', provinceCode: code }))}
        onSelectCity={(city) =>
          goto(routeToHash({ name: 'map', provinceCode: city.provinceCode, cityCode: city.code }))
        }
      />
    );
  } else if (cityCode === undefined) {
    content = (
      <ProvinceMap
        provinceCode={provinceCode}
        onSelectCity={(city) =>
          goto(routeToHash({ name: 'map', provinceCode, cityCode: city.code }))
        }
        onNavigateChina={() => goto(routeToHash({ name: 'map' }))}
      />
    );
  } else {
    const area = findCity(cityCode);
    const index = cityIndexByCode(cityCode);
    const cityName = area?.cityDisplayName ?? index?.name ?? cityCode;
    const provinceName =
      area !== undefined && area.provinceCode !== area.cityCode
        ? area.provinceName
        : (area?.provinceName ?? findCity(provinceCode)?.provinceName ?? provinceCode);
    content = (
      <CityTravelMap
        cityCode={cityCode}
        cityName={cityName}
        provinceName={provinceName}
        selected={selected}
        onTogglePoi={togglePoi}
        routeGenerated={routeGenerated}
        onGenerate={generate}
        focusPoiId={focusPoiId}
        onFocusPoi={(poi) => setFocusPoiId(poi.id)}
        onNavigateChina={() => goto(routeToHash({ name: 'map' }))}
        onNavigateProvince={() => goto(routeToHash({ name: 'map', provinceCode }))}
        onViewProfile={(userId) => goto(routeToHash({ name: 'userProfile', userId }))}
        onInvite={(tripId) => goto(routeToHash({ name: 'detail', tripId }))}
      />
    );
  }

  return (
    <main className="trip-page map-explorer-page">
      <Typography.Title level={2} className="page-title">
        旅行地图
      </Typography.Title>
      <Typography.Paragraph type="secondary" className="page-subtitle">
        选择省份 → 选择城市 → 选择景点生成路线 → 发现同路旅行者。
      </Typography.Paragraph>
      {content}
    </main>
  );
}