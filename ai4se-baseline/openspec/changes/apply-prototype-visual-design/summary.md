# 变更摘要：apply-prototype-visual-design

## Intent

把 `docs/prototype/` 已定义的视觉语言落到 `RouteME/frontend`：统一设计令牌与 Ant Design 主题、固定顶栏与侧栏外壳、身份门与首页的信息层级、行程卡 / 体验卡 / 空状态外观、深色模式与响应式约束。不改业务行为、接口契约与数据。

## What shipped

- **令牌与主题**：`src/styles.css` 重写为 tokens → base → shell → components → pages → antd → responsive 分区；`src/theme.ts` 提供浅 / 深色色板与 `buildTheme(mode)`，映射到 `ConfigProvider` 的 `token` / `components`。
- **外壳**：`src/shell/AppShell.tsx`（固定顶栏、品牌标记、身份切换、主题开关、左侧导航、≤900px 底部标签栏、跳过导航链接）；`useColorMode` 写 `data-theme` 与 localStorage `routeme.colorMode`；`App.tsx` 在路由变化时回到页首。
- **身份门**：`IdentityGate` 按原型重排为品牌 + 标语 + 价值闭环 + 三张身份卡（头像、昵称、学校、简介、兴趣、进入动作），仍为单一 `button`，无新增注册入口。
- **首页**：问候横幅（真实计数：招募中行程 / 游后体验 + 匹配对照说明）、计划 / 体验视图切换、筛选面板（搜索、目的地、日期区间、排序、兴趣胶囊、已应用条件摘要）、`TripCard` 网格、空状态；`tripFilters.describeFilters` 提供条件摘要。
- **组件**：`trips/TripCard.tsx` 复用封面、状态徽标、标题、日期、路线、标签、匹配度环、发布者与人数进度；`experiences/ExperienceCard.tsx` 改为作者 / 强度 / 正文 / 建议 / 来源与两个动作；`shell/EmptyState.tsx` 统一空态。
- **其余页面**：我的旅行复用 `TripCard`；详情、发布、申请、聊天、分享补 `panel` / `page-head` 语义类名，交互与文案不变；标签选择改为可访问的 `chip` 按钮。
- **测试**：新增 `home/greeting.test.ts`（6 例）与 `describeFilters` 用例，前端 34 → 42 项。

## Verify highlights

- `cd RouteME/frontend; npm run build`：typescript 0 错误；`dist/assets/index-*.css` 25.51 kB、JS 853.67 kB（Vite 仅提示 chunk 体积）。
- `cd RouteME/frontend; npm test`：6 个文件 / 42 项全过。
- 浏览器（后端 8080 + 前端 5173）：1440 / 1024 / 768 / 390 四档均无横向溢出（`scrollWidth === clientWidth`）；1440 与 1024 显示侧栏，768 与 390 显示底部标签栏；详情、我的旅行、发布页无 console error。
- 主题：切换后 `data-theme="dark"`，localStorage 写入 `dark`；切回后为 `light`。
- 视觉核对：身份门三卡、首页横幅与筛选、行程卡、详情与表单在浅色 / 深色下均按原型层级呈现。

## Residual risks

| 风险 | 处理 |
|---|---|
| 令牌在 CSS 与 `theme.ts` 两处同值 | `design.md` §2 映射表作为核对清单；改色同批修改 |
| 原型导航 4 项、实现 3 项（无聊天收件箱页） | 已在 proposal 的「原型对齐决议」记录；收件箱属于后续能力 |
| 首页只展示两个统计 | 其余两项接口在首页不可得，未虚构数字 |
| 深色模式未逐页做像素级对比度测量 | 令牌取原型加深色相；后续可补自动化对比度检查 |
| E2E 选择器未随视觉类名更新（本次未改文案与主要类名） | 本地 Playwright 未作为本次门禁；如需回归再跑 |

## Links

- Spec：`openspec/changes/apply-prototype-visual-design/specs/design-system/spec.md`
- Proposal / Design / Tasks：同目录 `proposal.md`、`design.md`、`tasks.md`
- Verify：`docs/ai4se-plugins/20261115-222500-local-verify-report.md`
- Prototype：`docs/prototype/styles.css`、`docs/prototype/ui.js`