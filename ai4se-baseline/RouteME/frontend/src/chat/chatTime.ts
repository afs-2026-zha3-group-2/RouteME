const pad = (value: number) => String(value).padStart(2, '0');

/**
 * 消息与集合时间的展示口径（对齐原型 `fmtStamp`）：
 * 今天 → `今天 HH:mm`；昨天 → `昨天 HH:mm`；其它 → `M/D HH:mm`。
 * 无法解析时原样返回。
 *
 * <p>集合时间是本地墙上时间（`yyyy-MM-ddTHH:mm`，无时区），
 * 不带 `Z` 时 `new Date` 按本地时间解析。</p>
 */
export function formatChatTime(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const sameDay =
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  if (sameDay) {
    return `今天 ${clock}`;
  }
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear()
    && date.getMonth() === yesterday.getMonth()
    && date.getDate() === yesterday.getDate();
  if (isYesterday) {
    return `昨天 ${clock}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${clock}`;
}
