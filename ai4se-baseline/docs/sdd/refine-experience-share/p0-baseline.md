# P0 基线记录 — refine-experience-share

- **Change：** `refine-experience-share`（能力 `trip-experiences` MODIFIED）｜ **故事：** S16 发布游后体验（issue #18）｜ **需求：** REQ-004
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-16
- **记录人：** Jay（AO）
- **分支：** `feature/refine-experience-share`（从 `main@c221819` 切出）

## 1. 阶段目标

确认本 change 可以开工：S16 的能力归属、规格权威、规则载体、知识库槽位与验证链路都在仓库里可查，不依赖口头约定。

## 2. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 规格树 | `openspec/specs/`（含 `trip-experiences`）、`openspec/changes/`（11 个进行中 change）、`openspec/templates/`、`openspec/config.yaml`（`schema: spec-driven`） | 存在且自洽 |
| 长期规格权威 | `openspec/specs/trip-experiences/spec.md`（7 Requirement / 22 Scenario，已含「无图片也能发布并展示内置封面」、两条拒绝场景与「我的旅行分享入口与分享边界」） | 本 change 以此为 MODIFIED 基线 |
| 已交付基线 | `openspec/changes/archive/2026-11-15-add-trip-experiences/`；`ExperienceController` / `ExperienceServiceImpl` / `ShareExperiencePage` / `ExperienceCard` / `e2e/tests/experiences.spec.ts` | S16 主干已交付，本 change 只收敛缺口 |
| 规则载体 | `docs/knowledge/rules/_INDEX.md`（6 分类 / 25 行索引）、`docs/knowledge/rules/{architecture,process,quality,security,testing,documentation}/rules.md` | 覆盖分支、提交、工件评审、前端样式、测试、PII |
| 知识库 | `docs/knowledge/_INDEX.md`、`docs/knowledge/_LOG.md` | 槽位可写 |
| 协作约定 | `ai4se-baseline/AGENTS.md`（仓库根、提交边界、四条开发原则） | 存在 |
| 阶段记录约定 | `docs/sdd/README.md`（P0–P5 产出、工件评审门禁、阶段提交信息格式） | 存在 |
| CI | `.github/workflows/ci.yml`（backend `./mvnw -B -ntp verify` + frontend build/test，JDK 21 / Node 22） | 存在 |
| CD | `.github/workflows/cd.yml` | 存在 |
| 工具链 | `openspec --version` → `1.16.1`；Node `v24.18.0`；npm `11.16.0`；OpenJDK `21.0.11` | 版本满足 pom / package.json 要求 |

## 3. 验证链路（本 change 将使用的命令）

| 层 | 命令 | 说明 |
|---|---|---|
| 规格 | `openspec validate refine-experience-share --strict` | change 结构合法性 |
| 前端静态 | `cd ai4se-baseline/RouteME/frontend; npm run typecheck` | `tsc --noEmit` |
| 前端单测 | `cd ai4se-baseline/RouteME/frontend; npm test` | vitest run |
| 后端回归 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test` | 含 `ExperienceControllerTest` / `ExperienceServiceTest` |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/experiences.spec.ts` | 需本地前后端运行 |

`docs/feedback/verification-commands.md` 仍是占位模板（静态 / 运行时 / 系统三段为空），本记录把实际命令固化在上表，P4 的验证报告引用同一条链路。

## 4. P0 DoV 检查

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在或显式延后 | Pass | `openspec/`、`docs/knowledge/`、`AGENTS.md`、`docs/sdd/` 均存在 |
| P0-2 | 规则覆盖分支 / 提交 / 测试 / 管道 / 安全 / NFR | Pass | `_INDEX.md` 25 行索引；本 change 触发 `spec-first`、`artifact-review-gate`、`git-commit-conventions`、`git-branching-and-pr`、`web-coding-style`、`web-testing`、`pii-scrubbing` |
| P0-3 | 阶段技能可解析 | Pass | `vendor/ai4se-plugins/recipes/p0..p5.md` 均 ready；`all-specs-review` 在 `.agents/skills/` |
| P0-4 | pack 隔离违规 | Skipped | 本 change 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | CI/CD 工作流在 `main` 运行；本 change 走同一管道 |

## 5. 缺口基线（进入 P1 的问题陈述）

| # | 缺口 | 证据 | 影响 |
|---|---|---|---|
| G-01 | 分享页与原型 `share()` 结构不符：无行程封面 hero、「你的体验会去哪里」三条说明缺失（现为一行 `Alert`）、分享边界只有一句 | `frontend/src/experiences/ShareExperiencePage.tsx`；`docs/prototype/ui.js` `share()` | 学生看不到「这条体验会去哪、哪些不能写」，S16 落点页面完成度不足 |
| G-02 | 体验卡没有内置封面 | `frontend/src/experiences/ExperienceCard.tsx`（无 cover 节点）；Living Spec「体验卡展示项目内置封面而不是空白占位」 | Living Spec 已声明行为与实现不一致 |
| G-03 | 不符合条件只有一条笼统提示 | `tripMessages.experienceNotAllowed`、`ShareExperiencePage` 的 `!canShare` 分支；Living Spec 两条拒绝场景分别要求「未结束」「未参加」提示 | 用户无法判断是行程没结束还是自己没参加 |
| G-04 | E2E 未覆盖「重复提交即修改」与「未参加者入口隐藏 / 被拒」 | `e2e/tests/experiences.spec.ts`（5 条用例，无上述断言） | S16 AC 1 / AC 3 缺可执行证据 |

## 6. 阶段产出

- 本记录：`docs/sdd/refine-experience-share/p0-baseline.md`
- 分支：`feature/refine-experience-share`
- 未新增代码或规格文件；P1 起才进入提案与规格。

## 7. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 基线证据可复现；承担 P1–P4 实现与阶段记录 | 2026-11-16 |
| SM | 待签署 | 准入 P1；S16 进入本迭代排期 | 待签署 |
| IO | 待签署 | REQ-004 为需求来源，`trip-experiences` 单 capability | 待签署 |

**阶段结论：Pass（required 5/5；P0-4 Skipped 不适用）。** 下一步 P1：意图 / 故事 / 提案。

## 8. 准入 P1 的条件

- `proposal.md` 写清 in-scope / out-of-scope，并说明与 `add-trip-experiences` 的关系（不重复定义已交付行为）。
- 缺口 G-01 ~ G-04 可追溯到 REQ-004、`openspec/specs/trip-experiences/spec.md` 与 issue #18。

## 9. R2 基线：分享页布局与样式对齐原型（2026-11-16 20:50）

用户评审已合入的分享页后指出「没有按照原型图来做布局和样式」。R2 只做**布局与样式对齐**，不改业务行为；沿用 `add-trip-publish` 的 R2/R3 先例，仍属同一 change（`refine-experience-share`），不新开 change、不归档。

| 项 | 复现 / 证据 | 结论 |
|---|---|---|
| 基准 | `docs/prototype/ui.js` `share()`；`docs/prototype/styles.css` `.form-grid` / `.form-main` / `.form-side` / `.intensity-picker` / `.int-card` / `.share-hero` / `.page-head`；原型实机走查（1440，`#/share/t_zhuhai_1`） | 原型是「页头 + hero + 双栏」结构 |
| 现状 | `frontend/src/experiences/ShareExperiencePage.tsx`；`styles.css` 无 `.form-grid` / `.intensity-picker` / `.int-card` | 现状是单列单卡，控件纵向堆叠 |

### R2 缺口

| # | 缺口 | 原型 | 现状 | 影响 |
|---|---|---|---|---|
| G-R2-01 | 无页头（标题 + 副标题）与返回链接样式 | `.back-link` + `.page-head`（`h1.page-title` + `p.page-sub`） | 只有 `detail-back` + 卡片内 `Typography.Title` | 页面的信息层级与其它页面不一致 |
| G-R2-02 | 无双栏网格 | `.form-grid`：`1.5fr` 主列 + `minmax(300px,.9fr)` 侧栏，≤900px 单列 | 单列 | 桌面端表单与说明挤在一列，与原型差异最大 |
| G-R2-03 | 表单未分组为面板 | 三个 `.panel`：真实感受 / 路线强度 / 给后来者的一条建议，标题带图标与分隔线 | 一个 `Card` 内用 `Typography.Text strong` 当字段标签 | 扫读性差，且缺少原型的分组语义 |
| G-R2-04 | 强度选择是 radio 列表，不是卡片 | `.intensity-picker` + 三个 `.int-card`（jade / amber / coral，选中态底色） | `Radio.Group` 竖排 | 选择成本高，选中态只有单选点 |
| G-R2-05 | 说明区不在侧栏面板 | `.form-side` 两个 `.panel`（你的体验会去哪里 / 分享边界），列表项带图标 | 卡片内联 `section.share-note`（上下堆叠） | 桌面端信息流与原型不同 |
| G-R2-06 | hero 元信息格式不同 | `目的地 · 11月7日 · 周六 · 2 人同行`；封面 76×60、圆角 12 | `目的地 · 2026-11-06 → 2026-11-06 · 2 人同行`；封面 96×64 | 日期不可读、尺寸偏大 |
| G-R2-07 | 操作按钮位置不同 | 主按钮 + 取消链接在「建议」面板底部 | 卡片最底部 `Space` + 取消按钮 | 与原型的信息节奏不一致 |

### R2 的 P0 复核

| id | 检查 | 结论 |
|---|---|---|
| P0-1 | 基线骨架 | Pass（同 §2） |
| P0-2 | 规则载体 | Pass（`@rule:web-coding-style`（样式 / 组件选型 / 可访问性）、`@rule:web-testing`、`@rule:spec-first`、`@rule:artifact-review-gate`） |
| P0-3 | 阶段技能可解析 | Pass |
| P0-4 | pack 隔离 | Skipped（不改 pack） |
| P0-5 | 管道骨架 | Pass（CI #157 / CD #89 已绿） |

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 复现证据完整，承担 R2 实现 | 2026-11-16 |

## 10. R2 准入 P1 的条件

- `proposal.md` 增补 R2 章节：只改布局与样式、不改行为与契约；验收信号可观察（结构、断点、卡片选中态）。
- 缺口 G-R2-01 ~ G-R2-07 可追溯到原型 `share()` / `styles.css` 与 `design.md` 的视觉基准声明。