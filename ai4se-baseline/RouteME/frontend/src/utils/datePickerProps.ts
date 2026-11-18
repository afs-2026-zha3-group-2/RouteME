/**
 * antd 6.7 在系统开启「减少动态效果」时会把日期弹层放到视口外，看起来像点击没反应。
 * 统一把弹层挂到字段容器，配合 styles.css 的 `.app-date-popup` 固定在字段下方。
 */
export const appDatePickerProps = {
  classNames: { popup: { root: 'app-date-popup' } },
  getPopupContainer: (trigger: HTMLElement) => trigger.parentElement ?? document.body,
};

/**
 * 靠近页面底部、下面没有滚动余量的字段：弹层向上展开（减少动态效果时生效），
 * 避免日历与「确定」按钮被固定底栏或视口裁掉。
 */
export const appDatePickerUpProps = {
  ...appDatePickerProps,
  classNames: { popup: { root: 'app-date-popup app-date-popup-up' } },
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

/**
 * antd 6.7 的 Select 也吃同一个「减少动态效果」缺陷：下拉层被固定到
 * `-1000vw / -1000vh`，用户点开看不到任何选项（同行设置等下拉全部失效）。
 * 与日期控件同口径：把弹层挂到字段容器，再由 CSS 固定在字段下方。
 */
export const appSelectProps = {
  classNames: { popup: { root: 'app-select-popup' } },
  getPopupContainer: (trigger: HTMLElement) => trigger.parentElement ?? document.body,
} as const;