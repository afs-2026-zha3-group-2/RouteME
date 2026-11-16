# Handoff — requirement workspace → OpenSpec

- **Workdir path:** `requirement-workspace/` (override if relocated)
- **OpenSpec changes root:** `openspec/changes/`
- **Rule:** Copy or link stabilized requirements into a change package. This
  workdir is never the long-term Living Spec authority (`openspec/specs/`).

| Artifact | Destination | Notes |
|---|---|---|
| `requirements/` entries | `openspec/changes/<id>/` proposal inputs | After `/sdd:pre-spec-req` |
| Ready / analysis packs | change package or archive | Project convention |

## REQ → OpenSpec change 映射（MVP P1，业务语言）

| REQ | 能力（capability） | change | 意图 | Ready 条目 | 提案 + 业务场景 spec |
|---|---|---|---|---|---|
| REQ-002 | `trip-plans` | `add-trip-plans` | `intents/REQ-002-trip-plans.md` | `requirements/REQ-002-trip-plans.md` | `openspec/changes/add-trip-plans/` |
| REQ-003 | `trip-companions` | `add-trip-companions` | `intents/REQ-003-trip-companions.md` | `requirements/REQ-003-trip-companions.md` | `openspec/changes/add-trip-companions/` |
| REQ-004 | `trip-experiences` | `add-trip-experiences` | `intents/REQ-004-trip-experiences.md` | `requirements/REQ-004-trip-experiences.md` | `openspec/changes/add-trip-experiences/` |
| REQ-005 | `trip-plans`（MODIFIED）/ `trip-experiences`（MODIFIED） | `refine-inspiration-home` | `intents/REQ-005-inspiration-home.md` | `requirements/REQ-005-inspiration-home.md` | `openspec/changes/refine-inspiration-home/` |
| REQ-006 | `user-auth`（MODIFIED） | `add-user-logout` | `intents/REQ-006-user-logout.md` | `requirements/REQ-006-user-logout.md` | `openspec/changes/add-user-logout/`（依赖的 `add-user-auth` 已归档） |
| REQ-007 | `user-profile`（ADDED）/ `user-auth`（MODIFIED） | `add-user-profile` | `intents/REQ-007-user-profile.md` | `requirements/REQ-007-user-profile.md` | `openspec/changes/add-user-profile/`（依赖的 `add-user-auth` 已归档） |

- 共享分析：`deep-dive.md`（①–④ 四表，含 REQ-005 / REQ-006 / REQ-007 增补）、`impact-brief.md`（覆盖 002/003/004/005/006/007 需求集）。
- 故事清单：`stories.md`（S03 → `stories/refine-inspiration-home.story.md`；S18 → `stories/add-user-profile.story.md`）；REQ-006 为单 change 小增量，P1 未拆故事，由 proposal + delta spec 承接（P1-4 允许 proposal 与 / 或 story list）。
- 依赖排序（轻 DAG）：REQ-002 → REQ-003 → REQ-004；REQ-005 为 REQ-002 / REQ-004 已上线能力的首页浏览增量，不改主 DAG；REQ-006 依赖 `add-user-auth` 已实现的会话契约。**`add-user-auth` 已于 2026-11-16 归档**（`openspec/changes/archive/2026-11-16-add-user-auth/`，Living Spec `openspec/specs/user-auth/`），`add-user-logout` 可在其后归档。REQ-007 同样依赖 `add-user-auth` 的已归档会话契约，与 `add-user-logout` 改的是 `user-auth` 的不同 Requirement 块（注册账号 vs 会话校验与退出），归档顺序互不阻塞。
- **BA 交付边界：** 以上为 P0/P1 业务产物。P2 起（delta-craft / design / task-plan / apply / verify / archive，含代码、契约、迁移、技术设计、任务分解）交 dev。
- **P2 状态（REQ-005）：** G1 Pass（2026-11-16）；Delta 评审见 `openspec/changes/refine-inspiration-home/dov-ac-review.md`，一致性检查见同目录 `consistency-lint.md`，决策见 `g1-decision.md`。
- **P3 状态（REQ-005）：** Pass（2026-11-16）；ATDD 设计 `atdd-design.md`、技术设计 `design.md`（D1–D8，含默认视图仍消费 `GET /api/matches` 的事实记录）、任务清单 `tasks.md`（T1–T6 + 对齐自检 Pass）；质量报告 `docs/ai4se-plugins/20261116-100821-quality-checklist-report.md`。
- **P4 状态（REQ-005）：** Pass（2026-11-16）；实现 `StatusBadge` + `TripCard` / `ExperienceCard` / `HomePage` / `tripMessages` / `styles.css`，E2E 新增 6 个用例；本地验证报告 `docs/ai4se-plugins/20261116-105446-local-verify-report.md`（前端 74 / 后端 154 / E2E 18 全绿，1440·768·390 走查通过，Overall Pass）；同轮修复 5 个先于本故事存在的 E2E 选择器漂移（提交 `551666e`，仅改测试）；无后端 / 契约 / 迁移 diff。下一步 PR 与 G2（`/sdd:pr-submit` → `/sdd:g2-decision-record`）。
- **P1 状态（REQ-006）：** Pass（2026-11-16）；提案与 delta 见 `openspec/changes/add-user-logout/`，`openspec validate add-user-logout --strict` 通过；质量报告 `docs/ai4se-plugins/20261116-102110-quality-checklist-report.md`。
- **P2 状态（REQ-006）：** Pass（2026-11-16）；Delta 评审 `dov-ac-review.md`（AC 4/4 + DoV 5/5 + Living Spec 基线保留 3/3）、一致性检查 `consistency-lint.md`（Pass，BLOCKER 0 / WARNING 0 / SUGGESTION 3）、决策 `g1-decision.md`（G1 Pass，条件 7 项）、质量报告 `docs/ai4se-plugins/20261116-103009-quality-checklist-report.md`。Delta 为 `user-auth` MODIFIED（10 场景），归档时替换 Living Spec「会话校验与退出」并保留基线场景。下一步 P3（`/sdd:atdd-design` → `/sdd:task-plan`）。
- **P3 状态（REQ-006）：** Pass（2026-11-16）；ATDD 设计 `atdd-design.md`（10 场景 → E1–E10，7 个 E2E 用例，API 回归门禁，NFR deferred）、技术设计 `design.md`（D1–D7，含入口全身份可见、失败非阻断提示、面板 `dialog` + 内层 `listbox`、退出样式 B）、任务清单 `tasks.md`（T1–T5 + 对齐自检 Pass）、设计预览 `preview/identity-menu.html`；质量报告 `docs/ai4se-plugins/20261116-104943-quality-checklist-report.md`。下一步 P4（`/sdd:atdd-apply`，从 T1 `e2e/tests/auth.spec.ts` 开始）。
- **P1 状态（REQ-007）：** Pass（2026-11-16）；意图 `intents/REQ-007-user-profile.md`、Ready 条目 `requirements/REQ-007-user-profile.md`（17 场景，DoR BLOCKER 0）、故事 S18 `stories/add-user-profile.story.md`、提案与双 delta 见 `openspec/changes/add-user-profile/`；`openspec validate add-user-profile --strict` 通过；质量报告 `docs/ai4se-plugins/20261116-104337-quality-checklist-report.md`。用户已裁决头像选填 / 学校 + 专业两框且学校选填 / 新增职业选填 / 注册瘦身 / 完善页可跳过 / 旅行方式单选 + 兴趣 3–5。下一步 P2（`/sdd:delta-craft`）。
- **P2 状态（REQ-007）：** G1 Pass（2026-11-16）；Delta 评审 `dov-ac-review.md`（AC 4/4 + DoV 5/5 + Living Spec 基线保留 4/4 + REQ-007 17/17 场景映射）、一致性检查 `consistency-lint.md`（Pass，BLOCKER 0 / WARNING 0 / SUGGESTION 6）、决策 `g1-decision.md`（Pass，条件 9 项含 owner）、质量报告 `docs/ai4se-plugins/20261116-110155-quality-checklist-report.md`。Delta 为 `user-profile` ADDED（7 需求 / 24 场景）+ `user-auth` MODIFIED「注册账号」（6 场景，保留基线 4 场景）。P2 补「学校与专业拼接展示」「旅行方式只能单选」两个场景闭合追溯。下一步 P3（`/sdd:atdd-design` → `/sdd:task-plan`）；归档前需 SA 具名追认双 capability 例外。
- **P3 状态（REQ-007）：** Pass（2026-11-16）；ATDD 设计 `atdd-design.md`（`user-profile` 24 场景 → E1–E24，`user-auth` 6 场景 → A1–A6；10 个 E2E + 11 个 API + 前端 2 个 UT 文件 + 后端 rules UT）、技术设计 `design.md`（D1–D12：8 列迁移、0.7.0 契约、派生规则、头像落盘与访问、权限模型、兴趣规范值、路由与入口、字段级错误）、任务清单 `tasks.md`（T1–T8 + 对齐自检 Pass）；质量报告 `docs/ai4se-plugins/20261116-111103-quality-checklist-report.md`。下一步 P4（`/sdd:atdd-apply`，从 T1 的 red 用例开始）。
