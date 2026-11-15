export function greetingForHour(hour: number): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return '你好';
  }
  if (hour < 6) {
    return '夜深了';
  }
  if (hour < 11) {
    return '早上好';
  }
  if (hour < 14) {
    return '中午好';
  }
  if (hour < 18) {
    return '下午好';
  }
  return '晚上好';
}