/** 概览页的纯函数：只做格式化与几何换算，不推导状态或窗口。 */

export type Counts = Record<string, number>;

export type StackSegment = {
  key: string;
  label: string;
  value: number;
  percent: number;
};

export type DonutSegment = {
  key: string;
  value: number;
  percent: number;
  offset: number;
};

/** 分桶占比（整数百分比）；总数为 0 时返回 0，避免出现 NaN。 */
export function percentOf(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0 || part <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

/** 堆叠条：固定键序、过滤 0 宽段；图例仍使用完整键序自行渲染。 */
export function stackSegments(
  counts: Counts,
  order: readonly string[],
  labels: Record<string, string>,
): StackSegment[] {
  const total = order.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
  return order
    .filter((key) => (counts[key] ?? 0) > 0)
    .map((key) => ({
      key,
      label: labels[key] ?? key,
      value: counts[key] ?? 0,
      percent: percentOf(counts[key] ?? 0, total),
    }));
}

/** 环形：按固定键序给出累计起点（百分比），供 stroke-dasharray 使用。 */
export function donutSegments(counts: Counts, order: readonly string[]): DonutSegment[] {
  const total = order.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
  let offset = 0;
  return order.map((key) => {
    const value = counts[key] ?? 0;
    const percent = percentOf(value, total);
    const segment = { key, value, percent, offset };
    offset += percent;
    return segment;
  });
}

/** 新增密度：窗口内平均每日新增相当于「1 条/日」的比例，封顶 100%。 */
export function windowRatio(part: number, windowDays: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(windowDays) || part <= 0 || windowDays <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((part / windowDays) * 100));
}

/** 千分位计数；0 显示为 0。 */
export function formatCount(count: number): string {
  return Math.max(0, count).toLocaleString('en-US');
}