# AC / DoV review — add-ai-itinerary

- **Change:** `add-ai-itinerary`（`ai-itinerary` ADDED 8 + `trip-plans` ADDED 1，REQ-017）
- **Reviewed artifact:** [`specs/ai-itinerary/spec.md`](specs/ai-itinerary/spec.md)（8 Requirement / 36 Scenario）+ [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)（1 Requirement / 5 Scenario）
- **Inputs:** [`proposal.md`](proposal.md)、发起人完整 User Story（AC1–AC18 / DoD 19 项 / 技术边界 / 建议 UI，2026-11-17）、`docs/sdd/add-ai-itinerary/p0-baseline.md`（G-01~G-07）、Living `openspec/specs/trip-plans/spec.md`
- **Timestamp:** 2026-11-17
- **Reviewer:** Jay（AO）
- **Tooling:** `openspec validate add-ai-itinerary --strict` → `Change 'add-ai-itinerary' is valid`；`openspec show --deltas-only` → `deltaCount: 9`

## AC review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 Each requirement has at least one testable AC | Pass | 9 Requirement ↔ 41 Scenario，每条 Requirement ≥3 场景 | 输入 / 生成 / 天气 / 地图 / 编辑 / 预算 / 失败 / 快照 / 保存均有可判定场景 |
| AC-2 ACs are observable | Pass | 场景断言可见结果：按钮可用性、Marker 编号、距离 / 时间来源、Tips 关键词、「AI 估算」标注、超预算差额文案、Error+Retry、详情页标识 | 无「正常工作 / 智能 / 合理」类不可判定表述；天气影响以室内标记占比 + Tips 内容断言 |
| AC-3 Negative / edge cases called out | Pass | 定位失败、POI 解析失败、AI 输出非法、key 未配置、超预报窗口、景点 <2、他人快照链接、非法快照、预算未填 | 覆盖三服务失败与数据边界 |
| AC-4 ACs are not disguised implementation detail | Pass | 场景只写用户可见行为与接口契约口径（错误码 / 状态码属契约行为）；未指定组件库 / CSS 类名 / HTTP 客户端 | DeepSeek / Open-Meteo 为发起人裁决的服务边界，非实现细节 |

## DoV review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 Scope matches proposal | Pass | In scope 5 组 ↔ 9 Requirement；Out of scope 7 项无对应需求 | 匹配 / 邀请 / 分享 / 实时价格 / 跨城 / 离线 SVG 页变更 / 独立管理页均未混入 |
| DoV-2 Ambiguities listed or resolved | Pass | 下方「规格解释裁决」8 条 | 天气阈值 / 编号口径 / 保存顺序 / 降预算语义 / 时长档位均已判定 |
| DoV-3 Role concerns noted for residual risk | Pass | 下方「残余风险」 | IO：技术边界不被 AI 虚构突破；SA：双 capability 粒度与既有发布保留；AO：E2E 确定性与并行会话 |
| DoV-4 No business implementation claimed done | Pass | 只改 Delta；AMap 基础与 savedRoutes 仅作 as-is 证据 | 代码落地在 P4 |
| DoV-5 Requirements trace to proposal / approved requirements | Pass | AC1–AC18 映射 18/18 + DoD 19/19 + Proposal In scope 全覆盖 | 见下表 |

**Blocking gaps:** 无。G1-ready from the review's perspective；是否签署由 IO / SA 决定。

## AC 映射（发起人 AC1–AC18 → Delta Scenario）

| AC | Delta Scenario | 覆盖判定 |
|---|---|---|
| AC1 出发地搜索 / 定位 / 点击 | 条件输入：搜索设置出发地 / 当前定位设置出发地 / 地图点击设置地点 | 完整（含定位失败负例） |
| AC2 目的地搜索 / 点击 | 条件输入：搜索或地图点击设置目的地 | 完整 |
| AC3 日期 / 时长 / 预算 / 方式 / 兴趣 / 节奏 | 条件输入：可选条件可设置 | 完整 |
| AC4 按钮门控 | 条件输入：生成按钮按必填项门控 | 完整 |
| AC5 ≥2 POI 完整行程 | AI 生成：生成完整推荐行程 | 完整（理由 / 顺序 / 到达 / 停留 / 预算 / 天气 / 装备） |
| AC6 POI 可定位 + Marker | 地图验证：POI 经高德解析后上图 | 完整 |
| AC7 高德算路线 / AI 不虚构 | 地图验证：路线数据来自高德；AI 生成：AI 不产出地图数据 | 完整 |
| AC8 编号与列表一致 | 地图验证：POI 经高德解析后上图 | 完整（编号口径见裁决 8） |
| AC9 Open-Meteo 按目的地 + 日期 | 真实天气：按目的地与日期获取天气；AI 生成：生成响应携带真实天气 | 完整 |
| AC10 注意事项 / 装备 | 真实天气：雨天 / 高温 / 低温 3 场景 | 完整 |
| AC11 天气影响推荐 | 真实天气：雨天推荐室内优先；AI 生成正文提示词注入 | 完整（阈值见裁决 1/2） |
| AC12 预算参与推荐 | 预算估算：超预算提示与降预算动作；AI 生成正文预算约束 | 完整 |
| AC13 AI 估算标注 | 预算估算：预算四项与 AI 估算标注 | 完整 |
| AC14 删除 / 更换 / 调序 | 行程编辑：删除景点 / 更换景点 / 调整顺序 | 完整 |
| AC15 变化后重算 | 地图验证：景点变化后重算 | 完整 |
| AC16 重新生成 | AI 生成：重新生成基于当前条件 | 完整 |
| AC17 保存为行程 | 快照保存 4 场景 + trip-plans：AI 方案保存为招募中行程 / 链接归属校验 / 详情页标识与摘要 / 保存后首页可见 / 普通发布不受影响 | 完整 |
| AC18 Loading / Error / Retry | 失败状态：Loading / AI 失败 / 天气失败 / 高德失败 / 未配置 key | 完整 |

## DoD 映射（19 项）

| DoD | 落点 | DoD | 落点 |
|---|---|---|---|
| 搜索地点 | 条件输入 R1 | 高德生成实际路线 | 地图验证 R4 |
| 当前定位 | 条件输入 R1 | 地图与行程列表同步 | 地图验证 R4 / 行程编辑 R5 |
| 地图点击选点 | 条件输入 R1 | 天气参与 AI 推荐 | 真实天气 R3 / AI 生成 R2 |
| 旅行日期 | 条件输入 R1 | 天气注意事项 / 装备 | 真实天气 R3 |
| 预算 | 预算估算 R6 | 预算估算展示 | 预算估算 R6 |
| 旅行偏好 | 条件输入 R1 | 编辑路线 | 行程编辑 R5 |
| 高德 JS API 2.0 | 地图验证 R4（复用 AMap 基础） | 重新生成 | AI 生成 R2 |
| Open-Meteo | 真实天气 R3 | 保存行程 | 快照保存 R8 + trip-plans R9 |
| AI 生成行程 | AI 生成 R2 | API 异常 Error / Retry | 失败状态 R7 |
| — | — | 不伪造地图 / 天气 / 价格 | R2 / R3 / R4 / R6 / R7 的 MUST NOT 约束 |

## 规格解释裁决

1. **雨天阈值：** 降雨概率 ≥60% 为「雨天」测试口径（E2E 用天气替身固定值）；室内景点占比高于无雨口径 + Tips 含雨伞 / 防水鞋类关键词为断言。真实天气下由 AI 按注入摘要判断，不做像素级断言。
2. **高温 / 低温阈值：** 最高温 ≥32°C 或 UV ≥8 触发防晒补水断言；最低温 ≤10°C 触发外套 / 温差断言（测试替身口径）。
3. **POI 解析失败：** 允许个别 POI 未定位；列表标「未定位」+ 更换入口；路线按已解析子集计算；已解析 <2 时阻断保存。不伪造坐标。
4. **保存顺序：** 先 `POST /api/ai/itineraries` 落快照 → 携 id 跳发布页预填 → 用户确认 `POST /api/trips`。行程创建失败时快照保留（用户资产），可再次进入发布页重试；不做跨接口事务。
5. **降预算语义：** 「AI 帮我降低预算」= 携 `reduceBudget` 约束重新生成，提示词要求合计 ≤ 预算；仍超支则再次显示超预算提示，不自动循环。
6. **天气窗口：** 日期限今天起约 16 天（Open-Meteo 预报窗口），超窗 400 可读拒绝；不伪造天气。
7. **时长档位：** 半天 / 1 天 / 2 天影响提示词景点数量与按天分组；E2E 只断言 ≥2 POI 与分组渲染，不锁死具体数量。
8. **编号口径：** Marker 编号 = 行程列表顺序号；未定位 POI 不渲染 Marker 但保留列表序号，已渲染编号与列表一一对应（不重排）。

## 残余风险

| 角色 | 风险 | 缓解 |
|---|---|---|
| IO（WAYNE） | AI 虚构坐标 / 路线 / 价格突破技术边界 | R2 / R4 / R6 的 MUST NOT + 后端输出契约不含地图字段 + P4 替身测试断言 |
| SA（Neal） | 双 capability（`ai-itinerary` + `trip-plans`）粒度 | trip-plans 只 ADDED 保存链接行为，既有发布 / 详情 Requirement 不改；「普通发布不受影响」场景兜底 |
| AO（Jay） | E2E 依赖真实 DeepSeek / 高德 / Open-Meteo 网络 | P3 atdd 定替身口径；CI 不依赖真实 key |
| AO（Jay） | 并行会话同改 styles / openapi / 详情页 | 提交只 stage 本 change 路径；push 前 pull；P4 合并后复验 |

## Next

- `phase=p2` → `consistency-lint.md` → `g1-decision.md`（IO WAYNE + SA Neal 具名签署）。