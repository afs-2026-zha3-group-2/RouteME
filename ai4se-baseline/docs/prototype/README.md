# RouteME 原型包（docs/prototype）

按版本归档。每个版本一个目录，新版本只新增目录，不改写已归档版本。

| 版本 | 目录 | 内容 | 状态 |
|---|---|---|---|
| **v2** | [v2/](v2/) | 六屏设计板（旅行灵感 / 旅行地图 / 发布行程 / AI 规划 / 我的旅行 / 同行消息），按六屏设计参考图的浅蓝灰画布 + 3×2 编号栅格重做；点击任一屏可放大交互 | 当前 |
| v1 | [v1/](v1/) | 可点击交互原型（行程 / 同行 / 体验主流程）、用户故事与验收场景、发现报告中英文版 | 归档 |

版本入口：[index.html](index.html)（选版本）→ 各版本目录内的 `index.html`。

## 版本约定

- **新版本 = 新目录**：`v3/`、`v4/` … 依次递增；跨版本对比直接并排打开两个目录。
- 版本目录自带 `README.md`，写清该版的页面清单、取景口径与已知取舍。
- 归档版本保持可打开、可追溯，不再接受结构性改动；需要修正时在最新版上改。
- 各版本均为纯静态文件，无构建步骤、无外部依赖，可直接 `file://` 打开，也可用 VS Code Live Server。

## v1 页面（归档）

| 文件 | 内容 |
|---|---|
| [v1/index.html](v1/index.html) | 原型包总入口，四个入口卡片 |
| [v1/prototype.html](v1/prototype.html) | 交互原型（行程 / 同行 / 体验主流程） |
| [v1/stories.html](v1/stories.html) | 用户故事与验收场景 |
| [v1/discovery-cn.html](v1/discovery-cn.html) | 发现报告（中文） |
| [v1/discovery-en.html](v1/discovery-en.html) | Discovery report (EN) |

支撑文件在 `v1/` 内：`data.js`（演示数据）、`store.js`（状态）、`ui.js` / `main.js`（渲染与交互）、`styles.css`（样式）。

> 说明：2026-11-16 之前的历史文档里出现的 `docs/prototype/ui.js`、`docs/prototype/styles.css` 等路径，现在对应 `docs/prototype/v1/` 下的同名文件。

## 权威与边界

- 发现报告的 HTML 版本只在本目录维护；Markdown 讨论记录（MVP 闭环、产品意图）仍在 [records/discussion/2026-11-13/](../../records/discussion/2026-11-13/)，两者不是同一份文件的两种格式，不要各自复制一份。
- 原型只服务于 REQ-002 / REQ-003 / REQ-004 的业务提案与验收讨论，不替代活规格（`openspec/specs/`）与接口契约（`openapi.yaml`）。
- 原型是 P1 交付物，不是生产前端；生产实现见 `RouteME/frontend/`。