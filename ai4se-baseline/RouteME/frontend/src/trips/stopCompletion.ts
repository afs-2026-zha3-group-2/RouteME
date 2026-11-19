/** 结束行程弹窗的完成点勾选：纯函数，状态为已勾选的下标集合（升序）。 */

/** 默认全选：全部途经点下标。 */
export function allChecked(stops: readonly string[]): number[] {
  return stops.map((_, index) => index);
}

/** 切换单个下标，返回升序新数组，不改入参。 */
export function toggleIndex(checked: readonly number[], index: number): number[] {
  const next = checked.includes(index)
    ? checked.filter((value) => value !== index)
    : [...checked, index];
  return next.sort((a, b) => a - b);
}