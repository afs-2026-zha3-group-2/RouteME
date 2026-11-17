const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** `2026-11-06` → `11月6日`；非法输入原样返回。 */
export function formatMonthDay(iso: string): string {
  const [, month, day] = iso.split('-');
  if (month === undefined || day === undefined) {
    return iso;
  }
  return `${Number(month)}月${Number(day)}日`;
}

/** `2026-11-06` → `周五`；空值或非法输入返回空串。 */
export function weekdayLabel(iso: string): string {
  if (iso === '') {
    return '';
  }
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '' : WEEKDAYS[date.getDay()];
}