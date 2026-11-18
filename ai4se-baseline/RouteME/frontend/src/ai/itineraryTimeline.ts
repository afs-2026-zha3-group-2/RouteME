/**
 * 行程拖拽 / 调序后的时间轴重算（纯函数）。
 *
 * <p>调序只改顺序不改到达时间会让时间轴出现「09:00 → 16:00 → 11:30」这种倒序，
 * 因此任何顺序变化后都要按「每天 09:00 出发 + 停留 + 20 分钟在途」重新排时间。
 * 时间只是建议值，不参与高德路线计算，也不写入 AI 快照契约的路线字段。
 */
import type { PlannerStop } from './plannerSession';

/** 每天的第一个景点默认从这里开始。 */
export const DAY_START_MINUTES = 9 * 60;
/** 相邻景点之间的在途缓冲（分钟）：用于给用户可读的时间轴。 */
export const TRANSFER_GAP_MINUTES = 20;

/** "HH:mm" → 当日分钟数；非法输入返回 null。 */
export function parseClock(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (match === null) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/** 当日分钟数 → "HH:mm"；跨天时钳到 23:59，避免出现 25:10。 */
export function formatClock(minutes: number): string {
  const clamped = Math.min(23 * 60 + 59, Math.max(0, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  const rest = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/**
 * 按当前顺序重排时间：每天从 09:00 开始，下一站 = 上一站到达 + 停留 + 在途缓冲。
 * 顺序与 day 不变，只更新 arrival。
 */
export function retimeStops<T extends PlannerStop>(stops: T[]): T[] {
  let currentDay: number | null = null;
  let cursor = DAY_START_MINUTES;
  return stops.map((stop) => {
    if (stop.day !== currentDay) {
      currentDay = stop.day;
      cursor = DAY_START_MINUTES;
    }
    const stay = Number.isFinite(stop.stay_minutes) ? Math.max(0, Math.round(stop.stay_minutes)) : 0;
    const next = { ...stop, arrival: formatClock(cursor) };
    cursor += stay + TRANSFER_GAP_MINUTES;
    return next;
  });
}

/**
 * 把 from 位置的景点拖到 to 位置（最终下标），跨天时采用目标位置的 day，
 * 并保证 day 在列表中单调不减，最后按新顺序重排时间。
 */
export function moveStopTo<T extends PlannerStop>(stops: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= stops.length || to >= stops.length) {
    return stops;
  }
  const targetDay = stops[to].day;
  const next = [...stops];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, { ...item, day: targetDay });
  // 跨天拖动后可能出现 day=2 的行排在 day=1 前面：后面的行跟随前一行，保持分天连续。
  let lastDay = next[0].day;
  for (let index = 1; index < next.length; index += 1) {
    if (next[index].day < lastDay) {
      next[index] = { ...next[index], day: lastDay };
    } else {
      lastDay = next[index].day;
    }
  }
  return retimeStops(next);
}