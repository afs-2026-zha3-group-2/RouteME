# Artifact review — refine-publish-route-map / spec（第 2 次，修订后）

- **Verdict: Pass**
- **Scope:** focus=Delta Spec（`@rule:artifact-review-gate` 的 P1 工件评审，修订稿复审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [`specs/trip-plans/spec.md`](../../openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md)（MODIFIED 1 Requirement / 18 Scenario）
- **Supersedes:** [`20261118-refine-publish-route-map-spec-review.md`](20261118-refine-publish-route-map-spec-review.md)（签署于 16 场景版本，已被本次扩写取代；原件保留不覆盖）
- **Supporting inputs:**
  - [`proposal.md`](../../openspec/changes/refine-publish-route-map/proposal.md)（D1–D9、AC-1 ~ AC-10）
  - [`p0-baseline.md`](../sdd/refine-publish-route-map/p0-baseline.md)（G-01 ~ G-10、关键基线事实 1–10）
  - Living Spec 基线：[`openspec/specs/trip-plans/spec.md`](../../openspec/specs/trip-plans/spec.md)「发布可被他人理解的旅行计划」
- **Evidence:**
  - [`openspec validate refine-publish-route-map --strict`](../../openspec/changes/refine-publish-route-map/) → `Change 'refine-publish-route-map' is valid`
  - 基线保留核对（脚本比对 Living Spec 与 Delta 的 Scenario 标题）：`baselineCount=7 deltaCount=18 missing=[]`
  - 新增 11 条：在地图上添加途经点并看到路线 / 途经点顺序可调整 / 切换出行方式重算路线 / 公共交通使用目的地城市规划 / 路线服务不可用时按顺序直线示意 / 降级提示不暴露实现细节 / 发布只提交地名与出行方式 / 坐标占位名不得进入发布 / AI 预填路线进入编辑器后可编辑 / 途经点超过上限时被拦截 / 窄屏与双主题不溢出
  - Requirement 正文核对：原「标题 ≤ 40 字、目的地来自固定候选、日期必填且结束不早于出发、至少两个途经点、人数 2–12、预算下限不高于上限、兴趣标签 ≤ 5、选填项」全部原文保留；新增段只追加「手动生成 + 首次后自动重算」、模式清单可注入、降级文案面向用户、占位名禁止入参
  - 代码口径核对：`TripTravelMode`（`driving` / `bicycling` / `transit`）与 Delta 三档一致；`MIN_STOPS` / `MAX_STOPS`（2 / 8）与 Delta 上下限一致；`AmapService.planRoute` 的 `city` 参数与「公共交通使用目的地城市规划」一致；`TripCreateRequest.stops` 与「只提交地名与出行方式」一致；`placePick.pointFallbackName` 的产出与「坐标占位名」场景一致；`WaypointPanel` 硬编码模式行与「模式清单可注入」不一致，属 P3 待改点
  - 规则核对：`rules/process/rules.md#spec-first`（P2 要求「MODIFIED 说明旧行为与新行为的差异」）、`#artifact-review-gate`；`rules/documentation/rules.md#document-conventions`、`#sdd-artifacts`；`rules/architecture/rules.md#api-contract`（本 change 不改契约，需在 Delta 显式声明）
- **Boundary note:** 本 change 不修改 `design-system`「应用外壳与导航」；导航入口移除见提案 D7 与 AC-7，理由是该条未列举「旅行地图」，移除不改变其可判定行为。
- **变更摘要（2026-11-18，P2 复用本报告 Pass）：** ① Delta 头部补「MODIFIED = 纯追加约束，7 个基线场景原文保留」的差异说明；② 模式段由 prop 级表述（`modes` / `modeLabels`）改写为两端可观察口径（发布页三档 / 探索页三档 / 不串味）。两处均不改变约束语义，场景数仍为 18、基线保留仍为 7/7，`validate --strict` 复跑 valid，故复用本报告的 Pass 与既有签署记录。

## 本次修订相对上一版的变化

| Scenario | 上一版 | 修订后 |
|---|---|---|
| 在地图上添加途经点并看到路线 | 加点即出现路线 | 加点后点「生成旅行路线」才绘线；重复点不重复加入保留 |
| 切换出行方式重算路线 | 只断言重算与无「步行」 | 追加自动重算（无需再点按钮）、三档标签「自驾 / 骑行 / 公共交通」、不出现「驾车」、行程顺序面板标题同步 |
| 路线服务不可用时按顺序直线示意 | 只断言直线与不空白 | 不变 |
| 降级提示不暴露实现细节 | 无 | 新增：只解释示意 / 估算与下一步，不出现服务名 / 端口 / 代理 / 重载 |
| 发布只提交地名与出行方式 | 只断言请求体字段 | 不变 |
| 坐标占位名不得进入发布 | 无 | 新增：占位名提交被拒并提示改名，改名后可发布 |

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P2 承接） | `rules/process/rules.md#spec-first` | Delta「发布只提交地名与出行方式」与 Requirement 正文 | 「编辑期坐标 MUST NOT 进入请求体 / 响应体 / 数据库」是接口边界约束，但 Delta 未给出可断言位置 | 维持上一版处理：P2 把断言点落到「请求体字段集合」，并确认契约 0.22.0 不变 | [inference] |
| F-2 | SUGGESTION（P3 承接） | `rules/testing/rules.md#web-testing` | Delta「公共交通使用目的地城市规划」 | 「不展示错误的换乘结果」依赖失败注入点，未指定注入层 | 维持上一版处理：P3 指定唯一注入点，并说明与「路线服务不可用」的分工，避免两条场景覆盖同一失败路径 | [inference] |
| F-3 | SUGGESTION（P2 承接） | `rules/testing/rules.md#web-testing` | Delta「在地图上添加途经点并看到路线」 | 「未点生成前不绘真实路线」是可观察行为，但未说明降级或已有预填点时是否自动生成 | P2 明确：预填 ≥ 2 点时仍由用户触发首次生成；若产品改为自动生成，需同步修改该 Scenario 的 Given | [inference] |
| F-4 | SUGGESTION（P3 承接） | `rules/testing/rules.md#web-testing` | Delta「切换出行方式重算路线」的「不出现『驾车』」 | 「不出现某文案」类否定断言容易写成整页文本扫描，误伤其他位置 | P3 把断言限定在编辑器模式行与行程顺序面板标题两个节点，P4 用可访问角色查询而非全页字符串匹配 | [inference] |
| F-5 | SUGGESTION（治理 / 归档） | `rules/process/rules.md#artifact-review-gate` | Delta 头部与 MODIFIED 归属 | 未归档的 `refine-trip-map` 与 `add-trip-publish` 同样 MODIFY 该 Requirement，三份 Delta 并存 | 维持上一版处理：G1 记录归档顺序与本 change 的权威范围（发布页路线段），后合并者负责重放场景 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 只 MODIFY `trip-plans` 一条 Requirement；无新增能力、无新端点、无迁移；接口边界在 Delta 内显式声明不变 |
| B Quality | N/A | 规格层无实现；术语沿用 Living Spec（途经点 / 出行方式 / 发布） |
| C Testing | N/A（场景已列） | 18 条场景均可判定；失败路径（服务不可用）、文案边界（降级提示）、输入边界（占位名）、容量边界（8 点）各有独立场景 |
| D Security | Pass | 场景不涉及权限或 PII；地点检索仍走既有代理白名单 |
| E Process | Pass | MODIFIED 明确旧行为（地名多选）与新行为（地图编辑器）差异；基线 7 场景原文保留；未触碰代码 |
| F Documentation | Pass | 正文中文、标识符英文；相对路径；无行号引用；Scenario 结构符合 `#### Scenario:` + Given/When/Then |
| G Traceability | Pass | AC-1/AC-2→「在地图上添加途经点并看到路线」「途经点超过上限时被拦截」；AC-3→「途经点顺序可调整」；AC-4→「切换出行方式重算路线」「公共交通使用目的地城市规划」；AC-5→「路线服务不可用时按顺序直线示意」「降级提示不暴露实现细节」；AC-6→「发布只提交地名与出行方式」；AC-8→「AI 预填路线进入编辑器后可编辑」；AC-9→「窄屏与双主题不溢出」；AC-10→「坐标占位名不得进入发布」；AC-7 见提案 D7（非本 Delta 覆盖） |

## Residual risks

- 「首次生成后自动重算」与「预填点是否自动生成」相邻，若 P2 不明确，P4 的 E2E 可能建立在错误前提上。
- 「不出现『驾车』」是产品措辞约束；`MODE_LABELS.driving` 为共享常量，若 P3 直接改常量而非注入标签，探索页会一起变。
- 「MUST NOT 提供步行」是产品口径；若后续地图侧新增步行需求，必须新开 change 修改 `TripTravelMode`，不得在 UI 单侧放开。
- 三份同 Requirement Delta 的合并顺序若颠倒，Living Spec 可能回退到「地名多选」口径；归档前需复核 `openspec/specs/trip-plans/spec.md` 的最终正文。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| Delta Spec（修订稿） | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「继续」 | 全文（1 Requirement / 18 Scenario） |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「继续」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Jacky（当前开发者） | 2026-11-18 | 发起人当次会话确认「继续」 | 结论与签署位 |