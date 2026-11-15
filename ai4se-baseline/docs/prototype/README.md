# RouteME 原型包（docs/prototype）

RouteME 路觅的可点击原型，纯静态文件，无构建步骤。直接用浏览器打开 [index.html](index.html) 即可；VS Code 中右键 `index.html` → **Open with Live Server**（若已安装）或直接用默认浏览器打开。

## 页面

| 文件 | 内容 |
|---|---|
| [index.html](index.html) | 原型包总入口，四个入口卡片 |
| [prototype.html](prototype.html) | 交互原型（行程 / 同行 / 体验主流程） |
| [stories.html](stories.html) | 用户故事与验收场景 |
| [discovery-cn.html](discovery-cn.html) | 发现报告（中文） |
| [discovery-en.html](discovery-en.html) | Discovery report (EN) |

支撑文件：`data.js`（演示数据）、`store.js`（状态）、`ui.js` / `main.js`（渲染与交互）、`styles.css`（样式）。页面之间用相对链接，移动目录时整包一起移动即可。

## 权威与边界

- 发现报告的 HTML 版本只在本目录维护；Markdown 讨论记录（MVP 闭环、产品意图）仍在 [records/discussion/2026-11-13/](../../records/discussion/2026-11-13/)，两者不是同一份文件的两种格式，不要各自复制一份。
- 原型只服务于 REQ-002 / REQ-003 / REQ-004 的业务提案与验收讨论，不替代活规格（`openspec/specs/`）与接口契约（`openapi.yaml`）。
- 本原型是 P1 交付物，不是生产前端；生产实现见 `RouteME/frontend/`。