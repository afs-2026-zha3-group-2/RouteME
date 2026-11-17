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

/**
 * 本地墙上时间（`yyyy-MM-ddTHH:mm`，无时区）与 antd 日期时间控件的边界转换。
 * 只在这个边界用 dayjs，表单状态与契约都保持字符串。
 */
export function localDateTimeToDayjs(value: string): Dayjs | null {
  return value === '' ? null : dayjs(value);
}

export function dayjsToLocalDateTime(value: Dayjs | null): string {
  return value === null ? '' : value.format('YYYY-MM-DDTHH:mm');
}