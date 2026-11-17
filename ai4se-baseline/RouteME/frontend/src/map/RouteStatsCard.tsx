/**
 * 路线统计卡（refine-trip-map R2 / design D15/D17）。
 * 景点数量 / 预计距离 / 预计时间 / 行程顺序；距离与时间标「预计」，
 * 离线直线距离×步行速度估算，不伪装真实导航结果。
 */

import { formatEstimateKm, formatEstimateMinutes, type RouteEstimate } from './routeEstimate';

type Props = {
  count: number;
  estimate: RouteEstimate;
  /** 行程顺序（景点名序列）。 */
  order: string[];
};

export function RouteStatsCard({ count, estimate, order }: Props) {
  return (
    <div className="route-stats" data-testid="route-stats">
      <div className="route-stats-grid">
        <div className="route-stats-item">
          <span className="route-stats-value">{count}</span>
          <span className="route-stats-label">景点数量</span>
        </div>
        <div className="route-stats-item">
          <span className="route-stats-value">{formatEstimateKm(estimate.km)} km</span>
          <span className="route-stats-label">预计距离</span>
        </div>
        <div className="route-stats-item">
          <span className="route-stats-value">{formatEstimateMinutes(estimate.minutes)}</span>
          <span className="route-stats-label">预计时间</span>
        </div>
      </div>
      <p className="route-stats-order">
        <span className="route-stats-label">行程顺序</span>
        {order.map((name, index) => (
          <span key={`${name}-${index}`} className="route-stats-order-item">
            {index > 0 && <i aria-hidden="true">→</i>}
            {name}
          </span>
        ))}
      </p>
      <p className="route-stats-note">离线估算，仅供参考，非真实导航结果。</p>
    </div>
  );
}