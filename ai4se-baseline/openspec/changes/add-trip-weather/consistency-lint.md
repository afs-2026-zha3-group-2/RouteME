# Consistency lint — add-trip-weather

- **Change：** `add-trip-weather`（`trip-weather` ADDED，REQ-022）
- **Phase：** `p2` ｜ **Timestamp：** 2026-11-17T20:40+0800 ｜ **Reviewer：** AI agent（GitHub Copilot）

## Verdict

**Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 3 / N/A 4）

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Status |
|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `specs/trip-weather/spec.md`「路线创建页的天气展示」 | 「未选择完整时显示未就绪」与「加载中」都可能出现空卡片，若实现只用一个布尔量容易把两者混淆 | P3 设计用显式状态枚举（`idle` / `loading` / `ready` / `unavailable` / `error`） | `[spec]` | 待 P3 |
| L-02 | SUGGESTION | p2 | `specs/trip-weather/spec.md`「基于真实天气的出行提醒」 | 多条提醒同时命中时的顺序未约定（例如既下雨又高温） | P3 设计固定顺序：降雨 → 高温 / UV → 低温 / 温差 → 强风 → 平稳 | `[design]` | 待 P3 |
| L-03 | SUGGESTION | p2 | `proposal.md` §残余风险 3；`dov-ac-review.md` R-2 | 城市中心坐标的精度限制在两处各写一次，措辞不同 | P5 写入 `summary.md` 时统一为一处权威表述 | `[archive]` | 待 P5 |
| L-04 | SUGGESTION | p2 | `openapi.yaml` 0.13.0 | 契约新增前未定义错误码枚举位置；天气上游失败沿用业务异常体系即可 | P4 复用 `BusinessException` + `GlobalExceptionHandler`，不新增 handler 分支 | `[contract]` | 待 P4 |

## Checklist coverage

| 检查 | 结论 | 证据 |
|---|---|---|
| Delta 使用 ADDED / MODIFIED / REMOVED 且与提案一致 | Pass | 仅 ADDED 1 个 capability / 6 Requirement；提案 In scope 6 项一一对应 |
| 场景可判定、无实现细节 | Pass | `dov-ac-review.md` AC-1 / AC-3 |
| 术语一致（行程 / 目的地 / 旅行日期 / 出行提醒） | Pass | 与 `trip-plans` 用词一致；未出现「天气提示」等同义轮换 |
| 数值口径唯一 | Pass | 阈值只在提醒 Requirement 出现一次 |
| 契约影响已声明 | Pass | 新增路径 + 3 schema；版本 0.16.0 |
| 数据影响已声明 | Pass | 明确「无迁移」并给出理由 |
| 与 Living Spec 无冲突 | Pass | `trip-plans` / `design-system` 未被改写 |
| 与在途 change 的冲突已登记 | Pass | `add-ai-itinerary` 天气代理重叠 → W-01（评审）/ R-1 |
| 安全与密钥 | Pass | Open-Meteo 免 Key；无新增密钥；`.env.local` 不入库 |
| 文案位置 | Pass | 文案集中在 `frontend/src/weather/messages.ts`，P3 落点 |

## N/A / skipped

| 检查 | 原因 |
|---|---|
| 数据库迁移评审 | 本 change 无迁移 |
| 权限 / 角色可见性 | 天气接口为公开只读，无身份依赖 |
| 文件上传 / PII | 不涉及 |
| 原型比对 | 原型无天气卡；本 change 为新增界面，按 antd + 既有令牌实现 |

## Fix suggestions by priority

1. **P3 必做：** 状态枚举（L-01）与提醒顺序（L-02）写进 `design.md`，并成为前端状态机与后端返回顺序的权威。
2. **P4 必做：** 契约错误复用既有异常体系（L-04），不新增全局 handler。
3. **P5 可做：** 精度限制表述统一（L-03）。

## Residual risks

- 与在途 `add-ai-itinerary` 的天气代理重复（已在提案与 G1 记录）。
- 阈值未经真实数据分布校准；如需调整属产品决策，另开需求。
- 城市中心坐标对微气候不足。

## Reviewer metadata

- 输入：`proposal.md`、Delta Spec（6 / 28）、`dov-ac-review.md`、REQ-022、P0 基线、`openapi.yaml` 0.13.0、`docs/prototype/`。
- 结论不代表 G1；G1 见 `g1-decision.md`。

## Next

- Pass → `g1-decision.md`；L-01 / L-02 落 P3，L-04 落 P4，L-03 落 P5。