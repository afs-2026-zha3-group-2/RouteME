# 变更提案：apply-prototype-visual-design

- **需求来源：** 用户指令「按照原型图与 SDD 方法把项目的样式做起来」｜ **能力：** `design-system`（ADDED）
- **规模：** S（仅前端表现层，无接口、无数据库、无业务规则变化）
- **原型：** `docs/prototype/styles.css`（设计令牌、外壳、卡片、门页）、`docs/prototype/ui.js`（`gate()` / `nav()` / `tripCard()` / `expCard()` / `discover()`）
- **规则：** `@rule:web-coding-style`、`@rule:coding-style`、`@rule:sdd-artifacts`

## 问题

REQ-001 至 REQ-004 已把业务闭环做通，但 `RouteME/frontend` 仍停留在脚手架外观：页面由 Ant Design 默认样式与一段约 350 行、只有布局没有视觉系统的 `styles.css` 组成。原型 `docs/prototype/` 已经定义了 RouteMe 的视觉语言（深海蓝绿主导、落日珊瑚动作色、暖砂中性面、固定顶栏 + 侧栏导航、行程卡与体验卡的信息层级），却没有进入生产前端。结果是：原型评审时看到的样子和真正跑起来的应用不一致，演示说服力与页面可读性都受损。

本 change 只解决「看起来是否像同一个产品」：把原型的令牌、外壳与组件外观落到生产前端，不改动任何业务行为、接口契约与校验规则。

## 范围

**In scope（表现层）**

- 设计令牌：把原型的颜色、圆角、阴影、字体、间距、断点收敛为 `styles.css` 的 CSS 变量，并映射到 Ant Design `ConfigProvider` 主题（按钮、输入、卡片、选项卡等组件跟随令牌）。
- 应用外壳：固定顶栏（品牌标记 + RouteMe／路觅 + 身份切换 + 深色模式开关）、左侧导航栏（旅行灵感 / 发布行程 / 我的旅行 + 价值闭环说明）、窄屏底部标签栏。
- 身份进入页：品牌、主标语、价值闭环标签、3 张身份卡（头像、昵称、学校、简介、兴趣、进入动作），保留「无注册」的边界。
- 首页：问候横幅（h1 + 简介 + 真实数据统计 + 匹配对照说明）、计划／体验视图切换、筛选面板（搜索 / 目的地 / 日期 / 排序 / 兴趣胶囊 / 已应用条件）、行程卡（封面、状态徽标、标题、日期、路线、标签、匹配度、发布者、人数进度）、空状态。
- 其余页面统一外观：行程详情、发布行程、我的旅行、同行申请、聊天、游后分享与体验卡；沿用现有结构与交互。
- 深色模式：`data-theme="dark"`，选择持久化在 localStorage；跟随系统偏好作为初值。
- 响应式与动效：≥1100px 侧栏常驻；≤900px 侧栏收起、底部标签栏接管导航；≤640px 单列；`prefers-reduced-motion` 关闭位移动效。

**Out of scope**

- 任何业务规则、接口、数据库迁移、路由结构、请求层与表单校验逻辑。
- 原型中不存在的演示增强能力（保存常用筛选、撤销、重置演示数据、演示脚本抽屉、主题以外的皮肤）。
- 聊天收件箱页、地图与封面图片等新功能；封面仍用渐变占位，不引入外部图片资源。
- 引入 Tailwind、CSS-in-JS 组件库或第二套 UI 框架：继续使用 Ant Design 作为组件层，样式走令牌 + 语义类名。

## 影响面

| 位置 | 改动 |
|---|---|
| `RouteME/frontend/src/styles.css` | 重写为 tokens → base → shell → components → pages → antd → responsive 分区 |
| `RouteME/frontend/src/theme.ts` | 新增：令牌常量 + `buildTheme(mode)`，把原型色板映射到 Ant Design |
| `RouteME/frontend/src/shell/` | 新增：`AppShell`、`useColorMode`、`Avatar`、`EmptyState` |
| `RouteME/frontend/src/trips/TripCard.tsx` | 新增：首页与我的旅行共用的行程卡 |
| `RouteME/frontend/src/identity/IdentityGate.tsx`、`home/HomePage.tsx`、`experiences/ExperienceCard.tsx` | 按原型重排展示结构（文案与数据来源不变） |
| `RouteME/frontend/src/App.tsx`、`main.tsx`、`index.html` | 接入主题、外壳、标题与图标 |
| 其余页面组件 | 仅补语义类名，行为不变 |
| `docs/knowledge/architecture/README.md`、`docs/knowledge/_LOG.md` | 登记设计系统与令牌落点 |

## 原型对齐决议

| 冲突点 | 原型 | 本 change 裁决 |
|---|---|---|
| 导航项 | 4 项，含「同行消息」收件箱 | 3 项；应用没有聊天列表页，聊天仍从行程 / 我的旅行进入，不新增页面 |
| 首页统计 | 招募中、体验、已建立同路、待处理申请 | 只展示前两项（当前接口在首页拿不到后两项），不虚构数字 |
| 保存筛选 / 撤销 / 重置数据 | 有 | 不纳入；属于新能力，需要新 change |
| 封面 | 虚线占位图 + 地形标签 | 保留渐变占位 + 目的地文字；不引入图片资源 |
| 状态色 | 4 态（含已取消） | 维持 3 态，新增「已取消」需业务 change |
| 颜色取值 | 原型 `--coral` / `--lagoon` 等手写值 | 取值以本 change 的 `styles.css` 令牌为准，`theme.ts` 同值映射，两处同批更新 |

## 验收信号

1. `npm run build`（类型检查 + 构建）与 `npm test` 通过。
2. 首页、身份门、行程详情、发布行程、我的旅行、聊天、体验页在 1440px 与 390px 宽度下无横向溢出，导航可达。
3. 身份切换、发布、申请、聊天、分享等既有交互与改造前一致（不新增/不丢失入口）。
4. 深色模式切换后重新加载仍保持选择；`prefers-reduced-motion` 下无漂移动画。
5. 状态除颜色外仍有文字；正文与背景对比度达到 WCAG AA（≥4.5:1）。

## Spec ID

`apply-prototype-visual-design`，增量规格见 `specs/design-system/spec.md`。