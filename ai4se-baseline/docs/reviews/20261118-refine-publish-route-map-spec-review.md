# Artifact review — refine-publish-route-map / spec

- **Verdict: Pass**
- **Scope:** focus=Delta Spec（`@rule:artifact-review-gate` 的 P1 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [`specs/trip-plans/spec.md`](../../openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md)（MODIFIED 1 Requirement / 16 Scenario）
- **Supporting inputs:**
  - [`proposal.md`](../../openspec/changes/refine-publish-route-map/proposal.md)（D1–D8、AC-1 ~ AC-9）
  - [`p0-baseline.md`](../sdd/refine-publish-route-map/p0-baseline.md)（G-01 ~ G-10、关键基线事实 1–10）
  - Living Spec 基线：[`openspec/specs/trip-plans/spec.md`](../../openspec/specs/trip-plans/spec.md)「发布可被他人理解的旅行计划」
- **Evidence:**
  - [`openspec validate refine-publish-route-map --strict`](../../openspec/changes/refine-publish-route-map/) → `Change 'refine-publish-route-map' is valid`
  - 基线保留核对（脚本比对 Living Spec 与 Delta 的 Scenario 标题）：`baselineCount=7 deltaCount=16 missing=[]`；新增 9 条：在地图上添加途经点并看到路线 / 途经点顺序可调整 / 切换出行方式重算路线 / 公共交通使用目的地城市规划 / 路线服务不可用时按顺序直线示意 / 发布只提交地名与出行方式 / AI 预填路线进入编辑器后可编辑 / 途经点超过上限时被拦截 / 窄屏与双主题不溢出
  - Requirement 正文核对：原「标题 ≤ 40 字、目的地来自固定候选、日期必填且结束不早于出发、至少两个途经点、人数 2–12、预算下限不高于上限、兴趣标签 ≤ 5、选填项」全部原文保留，新增段只追加路线编辑器、模式、降级、提交与预填约束
  - 代码口径核对：`TripTravelMode`（`driving` / `bicycling` / `transit`）与 Delta 的三档一致；`MIN_STOPS` / `MAX_STOPS`（2 / 8）与 Delta 的上限一致；`AmapService.planRoute` 的 `city` 参数与「公共交通使用目的地城市规划」一致；`TripCreateRequest.stops` 与「只提交地名与出行方式」一致
  - 规则核对：`rules/process/rules.md#spec-first`（P2 要求「MODIFIED 说明旧行为与新行为的差异」）、`#artifact-review-gate`；`rules/documentation/rules.md#document-conventions`、`#sdd-artifacts`；`rules/architecture/rules.md#api-contract`（本 change 不改契约，需在 Delta 显式声明）
- **Boundary note:** 本 change 不修改 `design-system`「应用外壳与导航」；导航入口移除见提案 D7 与 AC-7，理由是该条未列举「旅行地图」，移除不改变其可判定行为。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P2 承接） | `rules/process/rules.md#spec-first` | Delta「发布只提交地名与出行方式」与 Requirement 正文 | 「编辑期坐标 MUST NOT 进入请求体 / 响应体 / 数据库」是接口边界约束，但 Delta 未给出该边界的可断言位置 | P2 `dov-ac-review.md` 把断言点落到「请求体字段集合」而非「实现内部不保存坐标」（后者不可判定），并明确契约 0.22.0 不变 | [inference] |
| F-2 | SUGGESTION（P3 承接） | `rules/testing/rules.md#web-testing` | Delta「公共交通使用目的地城市规划」 | 「不展示错误的换乘结果」依赖失败注入点，当前未指定注入层（代理 mock 还是 `planRoute` 单测） | P3 `atdd-design.md` 为该场景指定唯一注入点，并说明与「路线服务不可用时按顺序直线示意」的分工，避免两条场景重复覆盖同一失败路径 | [inference] |
| F-3 | SUGGESTION（P2 承接） | `rules/documentation/rules.md#document-conventions` | Delta「途经点不足两个时拒绝发布」保留的既有文案「至少写出两个途经点」 | 新编辑器下该文案仍成立，但与 `fieldStops` 的「地图点选或搜索」提示并存，读起来重复 | P3 定稿文案时二选一：保留校验文案、精简字段提示；不在 Delta 层改措辞 | [fact] |
| F-4 | SUGGESTION（治理 / 归档） | `rules/process/rules.md#artifact-review-gate` | Delta 头部与 MODIFIED 归属 | 未归档的 `refine-trip-map` 与 `add-trip-publish` 同样 MODIFY 该 Requirement，三份 Delta 并存 | G1 记录归档顺序与本 change 的权威范围（发布页路线段）；归档时按顺序合并，后合并者负责重放场景 | [fact] |
| F-5 | SUGGESTION（已记录） | `rules/architecture/rules.md#api-contract` | Delta「发布只提交地名与出行方式」 | 「契约版本不变」写在 Scenario 的 Then 中，属约束声明而非用户可观察行为 | 接受：该条同时保护 0.22.0 不被误升；P2 复核时确认 `OpenApiTest` 无版本断言变更 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 只 MODIFY `trip-plans` 一条 Requirement；无新增能力、无新端点、无迁移；接口边界在 Delta 内显式声明不变 |
| B Quality | N/A | 规格层无实现；术语沿用 Living Spec（途经点 / 出行方式 / 发布） |
| C Testing | N/A（场景已列） | 16 条场景均可判定；失败路径（服务不可用）与容量边界（8 点）各有一条独立场景 |
| D Security | Pass | 场景不涉及权限或 PII；地点检索仍走既有代理白名单 |
| E Process | Pass | MODIFIED 明确旧行为（地名多选）与新行为（地图编辑器）差异；基线 7 场景原文保留；未触碰代码 |
| F Documentation | Pass | 正文中文、标识符英文；相对路径；无行号引用；Scenario 结构符合 `#### Scenario:` + Given/When/Then |
| G Traceability | Pass | AC-1/AC-2→「在地图上添加途经点并看到路线」「途经点超过上限时被拦截」；AC-3→「途经点顺序可调整」；AC-4→「切换出行方式重算路线」「公共交通使用目的地城市规划」；AC-5→「路线服务不可用时按顺序直线示意」；AC-6→「发布只提交地名与出行方式」；AC-8→「AI 预填路线进入编辑器后可编辑」；AC-9→「窄屏与双主题不溢出」；AC-7 见提案 D7（非本 Delta 覆盖） |

## Residual risks

- 「MUST NOT 提供步行」是产品口径；若后续地图侧新增步行需求，必须新开 change 修改 `TripTravelMode`，不得在 UI 单侧放开。
- 「不展示错误的换乘结果」在无网络环境下难以稳定复现；若 P3 未给出注入点，该场景将退化为人工走查。
- 三份同 Requirement Delta 的合并顺序若颠倒，Living Spec 可能回退到「地名多选」口径；归档前需复核 `openspec/specs/trip-plans/spec.md` 的最终正文。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| Delta Spec | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「全部批准」 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Jacky | 2026-11-18 | 发起人当次会话确认（当前开发者 = Jacky） | 结论与签署位 |