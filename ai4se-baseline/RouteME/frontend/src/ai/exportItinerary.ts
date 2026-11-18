/** AI 行程导出：把页面状态拼成 Markdown 文本（纯函数，不碰 DOM / 网络）。 */
import type { AiBudget } from '../types';
import { centsToYuan, sumBudgetCents } from './budgetMath';

export type ExportStop = {
  day: number;
  arrival: string;
  name: string;
  reason: string;
  stayMinutes: number;
};

export type ExportInput = {
  title: string;
  date: string;
  city: string;
  duration: string;
  travelMode: string;
  stops: ExportStop[];
  tips: string[];
  packing: string[];
  budget: AiBudget;
  /** 高德路线摘要；路线还没算出来时传 null，导出的仍是完整行程。 */
  distance: string | null;
  durationText: string | null;
};

/** 按天分组，保持输入顺序（页面时间轴同序）。 */
function groupByDay(stops: ExportStop[]): Array<{ day: number; stops: ExportStop[] }> {
  const days: Array<{ day: number; stops: ExportStop[] }> = [];
  for (const stop of stops) {
    const last = days[days.length - 1];
    if (last === undefined || last.day !== stop.day) {
      days.push({ day: stop.day, stops: [stop] });
    } else {
      last.stops.push(stop);
    }
  }
  return days;
}

export function itineraryToMarkdown(input: ExportInput): string {
  const lines: string[] = [];
  lines.push(`# ${input.title}`, '');
  const meta = [input.date, input.city, input.duration, input.travelMode]
    .filter((item) => item !== '')
    .join(' · ');
  if (meta !== '') {
    lines.push(`> ${meta}`, '');
  }
  if (input.distance !== null || input.durationText !== null) {
    const route = [input.distance, input.durationText].filter((item) => item !== null).join(' / ');
    lines.push(`路线：${route}（来自高德地图）`, '');
  }
  for (const day of groupByDay(input.stops)) {
    lines.push(`## Day ${day.day}`, '');
    for (const stop of day.stops) {
      lines.push(`- **${stop.arrival} ${stop.name}**（停留 ${stop.stayMinutes} 分钟）`);
      if (stop.reason !== '') {
        lines.push(`  - ${stop.reason}`);
      }
    }
    lines.push('');
  }
  lines.push('## 预算（参考估算，不含往返大交通）', '');
  lines.push(`- 交通：${centsToYuan(input.budget.transport_cents)} 元`);
  lines.push(`- 门票：${centsToYuan(input.budget.tickets_cents)} 元`);
  lines.push(`- 餐饮：${centsToYuan(input.budget.food_cents)} 元`);
  lines.push(`- 其他：${centsToYuan(input.budget.other_cents)} 元`);
  lines.push(`- 合计：${centsToYuan(sumBudgetCents(input.budget))} 元`, '');
  if (input.tips.length > 0) {
    lines.push('## 出行建议', '');
    for (const tip of input.tips) {
      lines.push(`- ${tip}`);
    }
    lines.push('');
  }
  if (input.packing.length > 0) {
    lines.push('## 建议携带', '');
    lines.push(input.packing.join('、'), '');
  }
  lines.push('---', '由 RouteMe 路觅 AI 规划生成');
  return lines.join('\n');
}