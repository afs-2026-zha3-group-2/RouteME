# design 评审报告（第 2 次 / R2） — refine-experience-share

- **工件：** `openspec/changes/refine-experience-share/design.md` §10「R2：布局与样式对齐原型」
- **change-id：** `refine-experience-share`
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:web-coding-style`（样式 / 组件选型 / 可访问性）、`@rule:web-testing`、`@rule:spec-first`）
- **重评原因：** R2 新增布局与样式设计（语义变更），另出本报告，不覆盖 `design-review.md`
- **评审输入：** `design.md` §10；`proposal.md`「R2」；Delta「分享页布局与原型一致」；原型 `share()` / `.form-grid` / `.intensity-picker` / `.int-card`；`frontend/src/styles.css`（`.publish-grid` / `.panel` / `.safety-list` / `--ring`）；`frontend/src/trips/TripCard.tsx`

## 评审结论

**Pass**

§10 把布局拆成结构、卡片选择器、图标、日期格式、样式、可访问性、测试影响七块，DOM 草图与 CSS 规则可直接落地；组件选型写清了 antd 不能覆盖的理由与替代方案，a11y 与断点都有落点。无 BLOCKER；3 条 SUGGESTION 在 P4 收口。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| R2-D-01 | SUGGESTION | `@rule:web-coding-style`（组件写法） | §10.2 | 用 `label:has(input:checked)` 还是 React 状态类未完全定死（文中两者都提到） | P4 采用 React 状态 `on` 类（更可控、不依赖 `:has` 支持），删掉 CSS 侧 `:has` 方案 | `ShareExperiencePage` 已有 `draft.intensity` |
| R2-D-02 | SUGGESTION | `@rule:web-coding-style`（样式） | §10.5 `.int-card` | 未写 `text-align: left`（`label` 默认居中会破坏原型左对齐） | P4 在 `.int-card` 补 `text-align: left` 与 `font: inherit` | 原型 `.int-card` |
| R2-D-03 | SUGGESTION | `@rule:web-testing` | §10.7 | `.publish-grid` 列数断言依赖 `getComputedStyle` 返回值字符串，跨浏览器可能带不同空白 | P4 用 `split(' ').filter(Boolean).length === 2` 判定，或断言 `ResizeObserver` 结果的 `offsetWidth` 关系 | Playwright Chromium |

## 与规格的一致性

| 检查 | 结论 |
|---|---|
| 是否覆盖 Delta 的布局约束（双栏 / 单列 / 三输入组 / 两说明组 / 卡片单选 / 按钮位置） | 是（§10.1、§10.2、§10.5） |
| 是否引入 out-of-scope | 否（§10 只动画布与样式；无行为、契约、迁移） |
| 是否满足「antd 优先」 | 是（给出比对与例外理由，属规则允许的自绘情形） |
| 是否满足可访问性 | 是（原生 radio、`:focus-within`、图标 `aria-hidden`、DOM 顺序） |
| 是否与 `TripCreatePage` 的骨架一致 | 是（`.publish-grid` / `.panel` / `.panel-title`） |
| 是否有回退路径 | 是（样式与结构集中在分享页，回退单页即可） |

## 残余风险

- `.publish-grid` 与发布页共用断点；发布页调整会影响分享页。
- `.int-card` 使用 `color-mix`，旧浏览器不支持时会退化为透明底（不影响可用性）。
- `tripDateFormat` 抽取后，行程卡的日期文本若与既有断言有字符差异会红；`trips.spec.ts` 需回归。

## 批准记录

- **批准人：** Neal（VL，审批）＋ Jay（AO，作者确认）
- **批准时间：** 2026-11-16T21:04+08:00
- **批准来源：** 用户在 2026-11-16 会话中确认「批准 R2 design 与 tasks」
- **批准范围：** 批准 `design.md` §10 进入 P4 实现；R2-D-01 ~ R2-D-03 留待 P4 收口。