# P0 基线记录 — add-destination-area-filters

- **Change：** `add-destination-area-filters`（REQ-007）｜ **阶段：** P0（Baseline）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 基线

- **远程基线：** `main@0680e94`（拉取后）；本 change 的 P1/P2 产物另见 `e2759bd`、`bba0c95`。
- **已归档能力：** `hello-world`、`trip-plans`、`trip-companions`、`trip-experiences`、`design-system`、`user-auth`。
- **进行中的 change：** `refine-inspiration-home`（REQ-005）、`add-trip-publish`、`add-match-reason`、`add-user-logout`（REQ-006）。
- **数据/契约基线：** `trip_plans.destination VARCHAR(20)` 中文名；V9 已被 `add-user-auth` 占用；`openapi.yaml 0.6.0`；三个列表接口仍声明 `q`。
- **目的地候选：** 前端 `map/placeCatalog` 16 城（广东 14 + 香港/澳门）；发布页用 `PlacePicker`。

## 2. 工具与门禁

| 项 | 值 |
|---|---|
| 后端 | Java 21 / Spring Boot 4.1.2 / MyBatis-Plus / SQLite / Flyway |
| 前端 | React 19 / Vite / antd / Vitest |
| E2E | Playwright（本地门禁，不进 CI） |
| 契约 | `npx @redocly/cli lint openapi.yaml` |
| 规格 | `openspec validate <change> --strict` |

## 3. 基线核对

- `requirement-workspace/`（intents/requirements/stories/analysis/ready/_templates/archive）存在。
- `openspec/{specs,changes,archive}` 存在；`docs/knowledge/rules`、`docs/sdd` 存在。
- 本记录只登记基线事实，不声称 P0 Gate 通过；P4 的验证报告负责真实命令与输出。

## 4. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | 基线可用，准入 P1 | 2026-11-16 |
| AO | Jay | 承接本 change 的 P1–P4 | 2026-11-16 |

**阶段结论：Pass（基线可用）**
