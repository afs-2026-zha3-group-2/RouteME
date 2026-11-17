/**
 * antd 6.7 在系统开启「减少动态效果」时会把日期弹层放到视口外，看起来像点击没反应。
 * 统一把弹层挂到字段容器，配合 styles.css 的 `.app-date-popup` 固定在字段下方。
 */
export const appDatePickerProps = {
  classNames: { popup: { root: 'app-date-popup' } },
  getPopupContainer: (trigger: HTMLElement) => trigger.parentElement ?? document.body,
};

/**
 * 日期 + 时间控件（如「集合时间」）的共用参数：与日期控件同一套弹层修补，
 * 显示格式固定为 `YYYY-MM-DD HH:mm`，契约值仍是 `yyyy-MM-ddTHH:mm`。
 */
export const appDateTimePickerProps = {
  ...appDatePickerProps,
  format: 'YYYY-MM-DD HH:mm',
  showTime: { format: 'HH:mm' },
  needConfirm: false,
} as const;