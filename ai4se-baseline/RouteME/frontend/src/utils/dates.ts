import dayjs, { type Dayjs } from 'dayjs';

/**
 * 契约与表单状态统一用 `YYYY-MM-DD` 字符串；antd 日期控件的 Dayjs 值只在这个边界转换。
 */
export function isoToDayjs(iso: string): Dayjs | null {
  return iso === '' ? null : dayjs(iso);
}

export function dayjsToIso(value: Dayjs | null): string {
  return value === null ? '' : value.format('YYYY-MM-DD');
}