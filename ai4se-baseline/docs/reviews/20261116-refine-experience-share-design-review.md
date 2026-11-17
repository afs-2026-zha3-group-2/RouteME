# design 评审报告 — refine-experience-share

- **工件：** `openspec/changes/refine-experience-share/design.md`
- **change-id：** `refine-experience-share`
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:pii-scrubbing`、`@rule:security-baseline`）
- **评审输入：** `design.md`；`specs/trip-experiences/spec.md`；`atdd-design.md`；`g1-decision.md`；`frontend/src/experiences/{ShareExperiencePage.tsx,ExperienceCard.tsx}`、`trips/{TripCard.tsx,TripDetailPage.tsx,tripStatus.ts}`、`i18n/tripMessages.ts`、`styles.css`（`--r` / `--surface-2` / `.safety-list` / `cover-*`）；`vite.config.ts`（`environment: 'node'`、`include: src/**/*.test.ts`）

## 评审结论

**Pass**

设计把 12 个 Delta 场景落到 3 个前端文件组 + 1 个 E2E 文件，明确「不改后端 / 契约 / 迁移」，并解释了 3 个关键取舍（单列布局、同行人数口径、`coverTone` 抽取）。无 BLOCKER；1 条 WARNING 与 3 条 SUGGESTION 在 P3 / P4 收口。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| DG-01 | WARNING | `@rule:web-testing` | §7 测试设计 | 测试环境是 `environment: 'node'` 且只收 `src/**/*.test.ts`，无法渲染 antd 组件；设计已选择纯函数 + E2E，但未写「为何不引入 jsdom」的判断依据 | 在 §1 或 §7 补一句「不为单次改动引入 jsdom / Testing Library 依赖」，避免后续评审误判缺组件测试（已在 `atdd-design.md` §1 体现） | `frontend/vite.config.ts`（test.environment / include） |
| DG-02 | SUGGESTION | `@rule:web-coding-style`（样式） | §5 样式 | 初稿新增 `.share-note-list`，与既有 `.safety-list`（✔ 前缀、12.5px）重复 | 已改为复用 `.safety-list`，只新增 `.share-note` 包裹层 | `styles.css:1243-1262` |
| DG-03 | SUGGESTION | `@rule:web-coding-style`（组件写法） | §3.4 `ExperienceCard` | 封面节点放在 `article` 内首位，但卡片已有 `border-top: 3px solid var(--dusk)`；加封面后顶部装饰重复 | P4 实现时把 `.exp-cover` 放在 `border-top` 之上并确认边框仍在（或在 `design.md` 记一句「保留 3px 顶边」） | `styles.css:1892-1904` |
| DG-04 | SUGGESTION | `@rule:web-coding-style`（文案与国际化） | §4 文案表 | `experienceNotCompletedHint` 只写「当前状态：」，拼接后为「当前状态：旅行中」，缺句末标点 | 保持现状（拼接更简单）；P4 走查确认可读性，必要时改为两段式 `description` | `tripStatus.statusLabel()` |

## 与规格的一致性

| 检查 | 结论 |
|---|---|
| 是否覆盖 Delta 3 条 Requirement / 12 场景 | 是（§3 + §7 + `atdd-design.md` 映射表） |
| 是否引入 out-of-scope 改动 | 否（§8 列出不动的 4 处：后端 / 契约 / `SafetyNote` / 首页筛选） |
| 是否满足「授权在服务边界判定」 | 是（D7：服务端唯一拒绝方，前端只做说明） |
| 是否满足 PII 红线 | 是（边界列表只提醒不采集；封面与 hero 不含隐私字段） |
| 是否与 `refine-safety-report` 的范围冲突 | 否（分享页的 `SafetyNote` 保持不变） |
| 是否有回退方案 | 是（§9：单文件 revert，无数据迁移） |

## 残余风险

- `coverTone` 抽取属跨模块搬运，若 `TripCard` 的哈希实现被误改，首页行程卡颜色会整体变化；P4 需回归 `trips.spec.ts` 与首页截图。
- `.exp-cover` 改变体验卡高度，`experiences.spec.ts` 的骨架 / 计数断言需同批复验。
- `--r` 在深浅色主题下值一致（14px），不涉及主题分叉。

## 批准记录

- **批准人：** Neal（VL，审批）＋ Jay（AO，作者确认）
- **批准时间：** 2026-11-16T16:40+08:00
- **批准来源：** 用户在 2026-11-16 会话中确认「批准 design.md 与 tasks.md」
- **批准范围：** 批准 `design.md` 进入 P4 实现；DG-01 ~ DG-04 留待 P4 收口。