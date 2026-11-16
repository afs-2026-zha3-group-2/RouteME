# proposal 评审报告（第 3 次 / R2） — refine-experience-share

- **工件：** `openspec/changes/refine-experience-share/proposal.md`「R2（2026-11-16）：布局与样式对齐原型」
- **change-id：** `refine-experience-share`
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:web-coding-style`、`@rule:sdd-artifacts`）
- **重评原因：** 已合入的 P4 版本布局与原型不符（用户评审意见）；R2 增补属语义变更（新增布局与样式要求），另出本报告，不覆盖 `proposal-review.md` / `proposal-review-2.md`
- **评审输入：** proposal「R2」章节；`docs/sdd/refine-experience-share/p0-baseline.md` §9（G-R2-01 ~ G-R2-07）；原型 `docs/prototype/ui.js` `share()` 与 `styles.css`（`.form-grid` / `.intensity-picker` / `.int-card` / `.share-hero` / `.page-head`）；`frontend/src/experiences/ShareExperiencePage.tsx`；`frontend/src/styles.css`（`.publish-grid` / `.panel` / `.panel-title`）

## 评审结论

**Pass**

R2 把「像不像原型」拆成 7 条可观察缺口与 8 条验收信号，范围限定在布局与样式，明确不改行为、文案语义、后端与契约；关键取舍（复用 `.publish-grid`、原生 radio 包卡片、本地图标、日期格式共享）都有理由与影响说明。无 BLOCKER；3 条 SUGGESTION 在 P3 / P4 收口。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| R2-P-01 | SUGGESTION | `@rule:web-coding-style` | 「决策」强度选择控件 | 写「antd 无卡片式单选」但未给出替代组件的核查结论（`Radio.Group` + 自定义 `render` / `Segmented` 也能做） | P3 `design.md` 记录一次组件选型比对：`Segmented` 语义是切换视图、`Radio.Group` 无法给出卡片布局，故自绘 label + 原生 radio；并写明键盘与读屏可用性 | antd 6.7 组件清单；原型 `.int-card` |
| R2-P-02 | SUGGESTION | `@rule:web-coding-style` | 「决策」网格类名 | 复用 `.publish-grid` 会让「发布页」类名出现在分享页，语义略有偏差 | P3 在 `design.md` 说明复用理由（同一双栏壳，避免第二套网格与断点）；如后续第三个页面复用再抽 `.form-grid` 别名 | `styles.css:1042-1060`、`1186-1194` |
| R2-P-03 | SUGGESTION | `@rule:web-testing` | 「验收信号」1 / 3 | 「双栏」「卡片选中态」是结构断言，未指定测试层 | P3 `atdd-design.md` 指定：E2E 断言 `.publish-grid` 的 `grid-template-columns` 在 1440 为两列、≤900 为一列；卡片选中断言 `.int-card.on` | `e2e/tests/experiences.spec.ts` |

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| R2 是否声明「不改行为」并列出边界 | 是（Out of scope 明确排除资格判定、提交 / 修改、回执、文案语义、后端 / 契约 / 迁移） |
| 是否与 P4 已交付内容冲突 | 否：保留 hero、去向、边界、两种不可用提示；只改它们的呈现与分组 |
| 是否引入新依赖 | 否：图标为本地组件，日期格式为本地模块 |
| 是否与原型冲突 | 否：结构、控件形态、操作位置、hero 元信息均以 `share()` 为准 |
| 验收信号是否可观察 | 是：双栏 / 单列、三面板、卡片底色、`role=radio`、元信息格式、按钮位置、走查维度 |
| 是否影响 Living Spec 语义 | 是（P2 需在 Delta 补布局约束与场景），已在「What Changes」声明 |

## 残余风险

- 复用 `.publish-grid` 若发布页后续改断点，分享页会一起变；已在 R2 残余风险中记录，P3 说明理由。
- 卡片式单选替换 `Radio.Group` 后，antd 的 `Radio.Group` 校验与 `Space` 布局移除，需确认表单事件仍只由原生 radio 触发。
- 图标取自原型路径，若原型后续改图标需同步；不引入图标库是刻意取舍。

## 批准记录

- **批准人：** WAYNE（IO/SA）
- **批准时间：** 2026-11-16T20:55+08:00
- **批准来源：** 用户在 2026-11-16 会话中确认「批准 R2 proposal」
- **批准范围：** 批准 R2 提案进入 Delta 补布局约束；R2-P-01 ~ R2-P-03 留待 P3 / P4 收口。