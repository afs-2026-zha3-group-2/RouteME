# 任务：refine-experience-share

- **依据：** [`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)、[`design.md`](design.md)、[`atdd-design.md`](atdd-design.md)
- **Owner：** Jay（AO）
- **顺序：** T1 → T2 → T3 → T4 → T5 → T6 → T7
- **约束：** 一条任务只落一层；契约 / 后端 / 迁移零改动，因此不存在「契约先于两端」的排序约束。

## 任务清单

### T1 [frontend] 内置封面与共享色调

- [x] 抽出 `frontend/src/trips/coverTone.ts`（目的地 → 五色 `cover-*` 哈希），`TripCard` 改为引用。
- [x] `ExperienceCard` 增加 `.exp-cover` 封面条（目的地名 + 同色调），`aria-hidden`。
- [x] `styles.css` 增加 `.exp-cover`（64px、复用 `--r` 与 `cover-*`）。

**验证：** `cd RouteME/frontend; npm run typecheck`；`cd RouteME/e2e; npx playwright test tests/trips.spec.ts tests/experiences.spec.ts`
**覆盖：** E8 无图片发布并展示内置封面

### T2 [frontend] 资格判定纯函数

- [x] 新增 `frontend/src/experiences/shareEligibility.ts`（`ready` / `notCompleted(status)` / `notParticipant`）。
- [x] 新增 `shareEligibility.test.ts`（U1–U4，含 `ongoing` 与状态优先）。

**验证：** `cd RouteME/frontend; npx vitest run src/experiences/shareEligibility.test.ts`
**覆盖：** E2 / E3 的判定分支

### T3 [frontend] 分享页说明

- [x] `ShareExperiencePage` 增加行程 hero（封面 / 标题 / 目的地 / 日期 / `participants.length` 人同行 / 状态徽标）。
- [x] 增加页面标题与副标题（`experienceShareHeading` / `experienceShareHeadingEdit` / `experienceShareSub`）。
- [x] 增加「你的体验会去哪里」三条与「分享边界」两条（`ul.safety-list`）。
- [x] `tripMessages` 增删键；删除 `experienceNotAllowed` / `experienceGoesTo` / `experiencePrivacy` / `shareBoundaryTitle`。
- [x] `styles.css` 增加 `.share-hero*` / `.share-note*`。

**验证：** `cd RouteME/frontend; npm run typecheck && npm test`
**覆盖：** E10 / E11 / E12

### T4 [frontend] 详情页入口复用同一判定

- [x] `TripDetailPage` 的 `canShare` 改用 `shareEligibility`；`participant` 保留给「即将结束」提醒。

**验证：** `cd RouteME/frontend; npm run typecheck`
**覆盖：** E4 发布者也可分享

### T5 [e2e] 场景回归

- [x] `shares an experience…`：补 hero、去向三条、边界两条、体验条数。
- [x] 新增 `updates the existing experience instead of adding another one`（体验条数恒为 1、旧文案消失）。
- [x] `keeps experience entry points honest`：未结束（动态建明日行程）与未参加（种子行程 1）两种提示。
- [x] 新增 `marks completed trips as shared in my trips`（已完成分组文案切换）。
- [x] `shows seeded experiences…`：补 `.exp-cover` 断言。

**验证：** `cd RouteME/e2e; npx playwright test tests/experiences.spec.ts`
**覆盖：** E1–E5、E9

### T6 [backend / frontend / e2e] 回归

- [x] 后端 `.\mvnw.cmd -B -ntp test`（`ExperienceControllerTest` / `ExperienceServiceTest` / `ExperienceServicePersistenceTest`）。
- [x] 前端 `npm run build`。
- [x] 全量 E2E（干净库）。

**验证：** 命令输出摘要见 `docs/ai4se-plugins/20261116-165905-local-verify-report.md`
**覆盖：** 无回归

### T7 [docs] 验证记录

- [x] `docs/ai4se-plugins/20261116-165905-local-verify-report.md`（命令、输出、E2E 对照、走查、失败归属）。
- [x] `docs/sdd/refine-experience-share/p4-verify.md` 与 `openspec/changes/refine-experience-share/g2-decision.md`。

**验证：** 报告可复核；`openspec validate refine-experience-share --strict`
**覆盖：** G2 证据

## 落点与边界

| 层 | 文件 |
|---|---|
| frontend | `trips/coverTone.ts`（新）、`trips/TripCard.tsx`、`experiences/ExperienceCard.tsx`、`experiences/shareEligibility.ts`（新）、`shareEligibility.test.ts`（新）、`experiences/ShareExperiencePage.tsx`、`trips/TripDetailPage.tsx`、`i18n/tripMessages.ts`、`styles.css` |
| e2e | `e2e/tests/experiences.spec.ts` |
| contract / backend / migration | **无改动** |
| docs | `docs/sdd/refine-experience-share/{p3-design,p4-verify}.md`、`openspec/changes/refine-experience-share/g2-decision.md`、`docs/ai4se-plugins/<ts>-local-verify-report.md` |

## 自检

| 检查 | 结论 |
|---|---|
| 每条 Delta Requirement 至少一个任务 | 通过：R1 → T2 / T3 / T5；R2 → T1 / T3；R3 → T1 / T3 / T5 |
| 一个任务只落一层 | 通过：T1–T4 frontend、T5 e2e、T6 回归、T7 docs |
| 契约任务排两端之前 | 不适用（无契约改动） |
| 每个任务有验证命令 | 通过 |
| 与 `atdd-design.md` 场景对应 | 通过：E1–E12 / U1–U4 落在 T2 / T3 / T5 |
| 不含 out-of-scope 项 | 通过：无图片上传、无双栏布局、无 S17、无后端改动 |