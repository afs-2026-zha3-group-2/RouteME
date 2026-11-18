# Spec review — add-ai-itinerary

- **Verdict: Pass**
- **Scope:** focus=spec（artifact-review-gate 的 Delta Spec 轮次，P2）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`specs/ai-itinerary/spec.md`](../../openspec/changes/add-ai-itinerary/specs/ai-itinerary/spec.md)（ADDED 8 Requirement / 36 Scenario）+ [`specs/trip-plans/spec.md`](../../openspec/changes/add-ai-itinerary/specs/trip-plans/spec.md)（ADDED 1 Requirement / 5 Scenario）
- **Supporting inputs:** [`proposal.md`](../../openspec/changes/add-ai-itinerary/proposal.md)（P1 评审 Pass）、[`dov-ac-review.md`](../../openspec/changes/add-ai-itinerary/dov-ac-review.md)（AC 4/4、DoV 5/5、AC1–AC18 映射 18/18、DoD 19/19、8 条裁决）、[`consistency-lint.md`](../../openspec/changes/add-ai-itinerary/consistency-lint.md)（Pass，0 BLOCKER / 0 WARNING / 5 SUGGESTION）、发起人完整 User Story（技术边界 / 保存字段清单）、Living `openspec/specs/trip-plans/spec.md`
- **Evidence:**
  - `openspec validate add-ai-itinerary --strict` → `Change 'add-ai-itinerary' is valid`（本轮实测）；`openspec show add-ai-itinerary --deltas-only --json` → `deltaCount: 9`
  - 规则锚点：`rules/process/rules.md#spec-first`、`#artifact-review-gate`；`rules/documentation/rules.md#sdd-artifacts`；`rules/architecture/rules.md#api-contract`；`rules/security/rules.md#no-hardcoded-secrets`
  - 41/41 Scenario 均含 Given / When / Then；9 Requirement 与 proposal What Changes 一一对应；无孤儿 Scenario、无 MODIFIED（S6 / S7 N/A）
  - dov 裁决 8 条已回写为可判定口径（天气阈值 / 编号 / 保存顺序 / 降预算 / 窗口 / 时长档位）；lint 5 条 SUGGESTION 全部标注 P3 收口位置与 owner

## Findings

| id | severity | rule | location | issue | result |
|---|---|---|---|---|---|
| F-1 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | `specs/ai-itinerary/spec.md` R8 + `specs/trip-plans/spec.md` R9 | 快照保存与行程创建两段式非事务，失败语义未在规格层展开 | **接受并延后**：dov 裁决 4 已定口径（快照为用户资产保留、可重试、不做跨接口事务）；lint L-01 交 P3 `design.md` 写明失败语义，不阻断 G1 |
| F-2 | SUGGESTION | `rules/process/rules.md#spec-first` | `specs/ai-itinerary/spec.md` R3 | 天气双路径（预览 GET + generate 自取）的权威口径未在规格层展开 | **接受并延后**：proposal 已定 generate 响应天气为权威方向；lint L-02 交 P3 `design.md` 收口，规格场景不冲突 |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 2（均延后 P3，有 owner）→ **Pass**

## 规格质量核对

| 检查 | 结论 |
|---|---|
| 结构合规（`## ADDED Requirements` / `### Requirement` / `#### Scenario`） | Pass（validate --strict valid） |
| 场景可观察、可测试 | Pass（按钮门控 / Marker 编号 / 距离时间来源 / Tips 关键词 / 「AI 估算」标注 / 超预算差额文案 / Error+Retry / 详情标识均为可见断言） |
| 负例与边界 | Pass（定位失败 / POI 解析失败 / AI 输出非法 / key 未配置 / 超预报窗口 / 景点 <2 / 他人快照链接 / 预算未填） |
| 技术边界固化 | Pass（AI 不产出坐标 / 路线 / 距离 / 交通时间 / 天气 / 实时价格：R2 / R3 / R4 / R6 / R7 MUST NOT；价格恒标「AI 估算」） |
| 既有行为保留 | Pass（`trip-plans` 只 ADDED；「普通发布不受影响」场景 + P4 `trips.spec.ts` 回归兜底） |
| 追溯完整性 | Pass（AC1–AC18 18/18；DoD 19/19；P0 G-01~G-07 全承接） |
| 契约口径 | Pass（`POST /api/ai/itineraries/generate` / `GET /api/weather/forecast` / `POST /api/ai/itineraries`；错误码 `AI_NOT_CONFIGURED` 503 / `AI_UPSTREAM_ERROR` / `AI_INVALID_OUTPUT` / `WEATHER_UPSTREAM_ERROR` / `INVALID_INPUT` 400；0.12.0 + V18 号段已核对） |
| 安全口径 | Pass（真实 key 走 gitignore `ai-local.yml` + 环境变量占位，不下发浏览器，符合 no-hardcoded-secrets） |

## Residual risks

- AI 输出质量依赖提示词与替身断言口径；P3 `design.md` 需给出 JSON schema 与解析失败处理（L-03）。
- E2E 若依赖真实上游则 CI 不稳定；P3 `atdd-design.md` 定替身口径（L-04）。
- 与并行会话共享 `openapi.yaml` / `styles.css` / 详情页；提交只 stage 本 change 路径，push 前 pull，P4 合并后复验。

## Next remediations（non-Gate）

- G1：`g1-decision.md`（IO WAYNE + SA Neal 具名签署），无阻断条件、无归档顺序条件。
- P3：`design.md` 收口 L-01 / L-02 / L-03 / L-05；`atdd-design.md` 收口 L-04；`tasks.md` 按 contract → backend → frontend → e2e 分解。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| specs/ai-itinerary/spec.md + specs/trip-plans/spec.md | 工件 1 | WAYNE | 2026-11-17 |
| 本报告 | 报告 1 | WAYNE | 2026-11-17 |
| 本报告 | 报告 2 | Jay（AO） | 2026-11-17 |
| g1-decision.md | G1 IO | WAYNE | 2026-11-17 |
| g1-decision.md | G1 SA | Neal（VL） | 2026-11-17 |

批准来源：发起人 2026-11-17 弹窗确认「批准（WAYNE + Jay + Neal）」，授权记录全部 5 个签署位；批准范围：Delta Spec（9 Requirement / 41 Scenario）、本评审报告与 G1 决策（Pass，无阻断条件）。