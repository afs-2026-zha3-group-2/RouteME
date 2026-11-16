# Consistency lint — refine-my-trips

- **Change:** `refine-my-trips`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/refine-my-trips/`）
- **Timestamp:** 2026-11-16T17:32+0800
- **Artifact level:** 2（proposal + 1 Delta Spec；无 `tasks.md` / `design.md`）
- **Tooling:** `openspec` CLI 1.16.1；`openspec validate refine-my-trips --strict` → valid

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 4 / N/A 5

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 WARNING | No |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

初版检查发现三处会被读成「静默扩张」的表述：proposal 的「行内动作」列了原型有但未交付的编辑 / 删除，Delta 的「已完成」分组未说明沿用体验资格，影响面的契约行未写兼容性口径。已在 P2 修订：proposal 明确「只落地已交付能力」，Delta 用「发表 / 修改游后体验」并交由 `trip-experiences` 资格决定，影响面补「`required` 不变、次版本递增」。剩余 4 条为 P3 / P4 / P5 提示性建议，不阻塞 G1。

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `specs/trip-companions/spec.md`「行内动作按分组提供」 | 「已匹配」行只写三个动作，未写「非发布者」条件；读者可能以为发布者在已匹配也能看到「退出同行」 | P3 `atdd-design.md` 写明「已匹配 = 非本人发布 + 已接受 + 未结束」；E2E 用他人行程覆盖 | `MyTripsServiceImpl` matched 过滤条件 | code | [fact] |
| L-02 | SUGGESTION | p2 | `proposal.md`「影响面」`MyTripsResponse.java` 行 | 未写 `pending_applications` 的去重与空值行为（无待处理时是空数组还是缺省） | 设计决定：无待处理时返回空数组（不是 null），`OpenApiTest` 断言类型；P3 记录 | `openapi.yaml` `type: array` | spec | [fact] |
| L-03 | SUGGESTION | p2 | `specs/trip-companions/spec.md`「重新可见时同步状态」 | 「标签页重新可见或窗口获得焦点」在两个事件同时触发时可能重复请求 | P3 设计加 600ms 去抖 / 单飞（in-flight 去重），并写进 `design.md` | 浏览器事件顺序 | AI-inference | [fact] |
| L-04 | SUGGESTION | p2 | `proposal.md`「归档顺序」；`refine-experience-share` P4 | 两 change 同改「已完成」分组入口；后归档者可能覆盖前者的文案 | P5 归档前跑 `experiences.spec.ts` 并人工对比两处文案 | `experiences.spec.ts:191-201` | proposal | [fact] |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | `proposal.md` §Why，说明六处缺口与证据 |
| P2 `## What Changes` | Pass | §What Changes 7 条 + §范围 In scope 9 条 |
| P3 Non-Goals | Pass | §范围 Out of scope 7 条，具体（编辑 / 删除 / 参考发布 / 分页 / 轮询 / 自绘控件 / 推送） |
| P4 Impact self / upstream / downstream | Pass | §影响面覆盖前端页面 / 纯逻辑 / 文案 / 样式 / 类型、后端响应 / 服务 / 测试、契约、E2E、Living Spec |
| S1 Spec structure | Pass | `## MODIFIED Requirements` + `### Requirement` + `#### Scenario`；`validate --strict` valid |
| S2 / S2b / S2c 引用前缀与可达性 | Pass | proposal 的 `@rule:` 均可在权威区解析（`spec-first` / `sdd-artifacts` / `artifact-review-gate` / `git-commit-conventions` / `web-coding-style` / `api-contract` / `web-testing` / `pii-scrubbing`） |
| S3 Requirement → proposal | Pass | MODIFIED Requirement 的职责与 proposal §范围 1–9 一致 |
| S4 Given / When / Then | Pass | 11/11 Scenario 均具备 Given / When / Then |
| S5 Scenario 归属 | Pass | 无孤儿 Scenario；全部挂在同名 Requirement 下 |
| S6 MODIFIED 基线存在 | Pass | `openspec/specs/trip-companions/spec.md` 存在同名 Requirement；delta 未改 Requirement 名 |
| S7 MODIFIED 未丢基线场景 | Pass | 4 个既有场景名全部保留（分区展示我的旅行 / 待处理申请提醒 / 安全提示常驻 / 提交举报并收到回执） |
| C1 proposal → spec | Pass | In scope 9 项均有 Scenario 落点（见 `dov-ac-review.md`） |
| C2 spec → tasks | N/A | `tasks.md` 未创建（P3） |
| C6 引用可达 | Pass | 规则文件与 change 路径均存在 |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 proposal scope vs Delta | Pass | 无静默扩张 / 丢弃；原型未交付动作已显式排除 |
| p2-2 Delta 内部一致 | Pass | 四组定义、行内动作与提醒目标互不矛盾；「无待处理」与「有提醒」互斥 |
| p2-3 proposal 关键场景有落点 | Pass | REQ-013 §4 十二条场景 12/12 |
| p2-4 tasks 方向检查 | N/A | 无 `tasks.md` |
| p2-5 无法追溯的 Requirement | Pass | 无 |

## N/A / skipped

- C2、p2-4、T1–T3（无 `tasks.md`，P3 产出）
- D1–D3（无 `design.md`，P3 产出）

## Fix suggestions by priority

1. **P3（should）：** 按 L-01 / L-03 在 `design.md` 与 `atdd-design.md` 写明分支条件与请求去抖。
2. **P3（should）：** 按 L-02 定下 `pending_applications` 的空数组语义，并让 `OpenApiTest` 断言。
3. **P5（should）：** 按 L-04 与 `refine-experience-share` 对齐完成组文案。

## Residual risks

| 风险 | 说明 |
|---|---|
| MODIFIED 合并被简化 | 归档工具若只处理新增场景，基线 4 场景可能回退；P5 用 diff 逐条核对 |
| 与并行 change 的文案漂移 | 两 change 都改完成组入口；L-04 兜底 |
| 本报告不覆盖代码质量 | 实现与测试在 P3 / P4 验证 |

## Reviewer metadata

- Reviewer: Jay（AO）
- Human sign-off: pending（G1 由 IO + SA 具名记录）
- Date: 2026-11-16
- 本报告不是 Gate 决策；建议仅供参考，不自动改写权威规格。

## Next

- `phase=p2` → `g1-decision.md`（需 IO WAYNE + SA Neal 具名签署）。