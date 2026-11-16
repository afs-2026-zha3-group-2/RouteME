// 卡片网格桌面端每行 3 列；容量取 15 的倍数，满页时每列都能填满，不留半行。
export const PAGE_SIZE_OPTIONS = [15, 30, 45];
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
export const MAX_PAGE_SIZE = PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1];

export type PageSlot = number | 'gap';

/**
 * 页码窗口：首页、末页与当前页附近的页码，中间用 'gap' 表示省略。
 * totalPages <= 0 时返回空数组（不渲染分页控件）。
 */
export function pageWindow(current: number, totalPages: number, span = 1): PageSlot[] {
  if (!Number.isInteger(totalPages) || totalPages <= 0) {
    return [];
  }
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const clamped = Math.min(Math.max(current, 1), totalPages);
  const from = Math.max(2, clamped - span);
  const to = Math.min(totalPages - 1, clamped + span);
  const slots: PageSlot[] = [1];
  if (from > 2) {
    slots.push('gap');
  }
  for (let page = from; page <= to; page += 1) {
    slots.push(page);
  }
  if (to < totalPages - 1) {
    slots.push('gap');
  }
  slots.push(totalPages);
  return slots;
}