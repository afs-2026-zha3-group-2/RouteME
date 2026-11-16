# All specs review — refine-trip-chat（spec，第 2 次）

- **Verdict: Pass**
- **Scope:** focus=full（Delta Spec 重评）；root=`ai4se-baseline`；timestamp=2026-11-16
- **触发原因：** P3 设计阶段发现错误码口径与现有实现冲突（`@rule:api-contract` 的 422 vs 仓库既有 400/403/409），经用户 2026-11-16 裁决「跟现有实现」，Delta Spec 中 4 处 422 需订正，属语义修改，按 `@rule:artifact-review-gate` 重评，不覆盖首份报告。
- **Artifact under review:** [`specs/trip-plans/spec.md`](../../openspec/changes/refine-trip-chat/specs/trip-plans/spec.md)（3 Requirement / 22 Scenario）
- **未变更：** [`specs/trip-companions/spec.md`](../../openspec/changes/refine-trip-chat/specs/trip-companions/spec.md)（3 Requirement / 21 Scenario）
- **Evidence:**
  - `openspec validate refine-trip-chat --strict` → `Change 'refine-trip-chat' is valid`
  - 现状核对：`InvalidInputException` → 400 `INVALID_INPUT`；`ForbiddenActionException` → 403 `FORBIDDEN`；`ChatNotAllowedException` → 403 `CHAT_NOT_ALLOWED`；`ChatReadOnlyException` → 409 `CHAT_READ_ONLY`；`TripNotOpenException` → 409 `TRIP_NOT_OPEN`；全仓库无 422

## 变更摘要

| 位置 | 旧表述 | 新表述 |
|---|---|---|
| 「发布者维护集合信息」需求正文 | 格式非法 400、晚于结束日期 422 | 字段类错误 400 `INVALID_INPUT`、非发布者 403 `FORBIDDEN`、已结束 409；显式声明本 change 不引入 422 |
| 场景「已结束行程不能编辑集合信息」 | 拒绝（422） | 拒绝（409） |
| 场景「非发布者不能编辑集合信息」 | 拒绝（422） | 拒绝（403） |
| 场景「集合信息校验失败时不保存」 | 系统拒绝并提示对应字段 | 以 400 `INVALID_INPUT` 拒绝并提示对应字段 |

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| S-1 | SUGGESTION | `rules/architecture/rules.md#api-contract` | 本 Delta 与 `design.md` D13 | 规则写 400/422，仓库实现为 400/403/409；本次按用户裁决降级规则措辞 | 在 P4 验证报告与交付说明记录该偏离（规则 ID、范围、原因），不改老端点状态码 | [fact] |
| S-2 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | REQ-013 §5、`proposal.md`、`atdd-design.md` | 同一口径散落在四处文档，存在再次漂移的风险 | P4 完成后统一以 `design.md` D13 为唯一口径，其它文档只引用 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 2 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 错误码与现有异常族一致；新端点不新增错误码 |
| B Quality | Skipped | 无代码改动 |
| C Testing | Skipped | 无代码改动；`atdd-design.md` A2/A6/A8/A10 已同步为 400/403/409 |
| D Security | Pass | 权限拒绝仍在服务端执行 |
| E Process | Pass | 语义修改走重评，不覆盖首份报告 |
| F Documentation | Pass | 中文正文；规则锚点与路径正确 |
| G Traceability | Pass | 仅订正错误码，不影响 25/25 场景映射 |

## Residual risks

- 规则与实现的错误码口径长期不一致；本 change 只记录偏离，不回写规则（回写需走 `/sdd:rules-govern`）。
- 若后续 change 引入 422，需统一迁移老端点，否则仓库出现两种风格。

## Next remediations（non-Gate）

- 继续 P3：输出 `design.md` 评审与 `tasks.md` 评审。
- P4 验证报告记录本偏离。

## 审批

> 本次 spec 重评结论为 **Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 2）。

- **批准人：** Jay（AO）
- **批准时间：** 2026-11-16
- **批准范围：** `specs/trip-plans/spec.md` 错误码订正（4 处 422 → 400 `INVALID_INPUT` / 403 `FORBIDDEN` / 409）
- **批准方式：** 与 `design.md` / `tasks.md` 同批人工确认
- **后续约束：** 以 `design.md` D13 为错误码唯一口径；P4 验证报告记录与 `@rule:api-contract` 的偏离
