/**
 * antd 6.7 在系统开启「减少动态效果」时会把日期弹层放到视口外，看起来像点击没反应。
 * 统一把弹层挂到字段容器，配合 styles.css 的 `.app-date-popup` 固定在字段下方。
 */
export const appDatePickerProps = {
  classNames: { popup: { root: 'app-date-popup' } },
  getPopupContainer: (trigger: HTMLElement) => trigger.parentElement ?? document.body,
};