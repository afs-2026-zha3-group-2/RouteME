# 首页移除脚手架问候语旁注（remove-home-greeting-note）

- **状态：** 已实现，待归档（VL 明确指示：首页不再显示这一行）
- **变更目标：** 首页正文不再出现「后端问候语：Hello World」这一行脚手架旁注
- **影响能力：** `hello-world`（MODIFIED）
- **不涉及：** `GET /api/greeting` 契约、`greetings` 表、Flyway 迁移、后端实现与后端测试

## 背景

`hello-world` 的验收能力原先依赖首页底部展示一行「后端问候语：{message}」，用来证明问候语来自 SQLite 而不是前端硬编码。首页已经演进为旅行灵感首页，这行旁注没有任何用户价值，只是把脚手架细节暴露在产品界面里。后端 `GreetingControllerTest`、`GreetingServiceTest`、`GreetingMapperSqliteTest` 与 `OpenApiTest` 已经足以证明「数据库 → 接口」这条链路，因此把展示端摘掉，验收证据不丢失。

## In scope

- 删除 `HomePage` 的 `ConnectivityNote` 组件与其渲染。
- 删除因此不再被引用的 `home/useGreeting.ts`、`api.ts` 的 `loadGreeting`、`types.ts` 的 `Greeting`、`i18n/tripMessages.ts` 的 `connectivityLabel`、`styles.css` 的 `.connectivity-note`。
- `hello-world` 规格改为「首页不展示问候语」，接口与数据库场景原样保留。

## Out of scope

- 不去掉 `/api/greeting` 端点、迁移脚本或后端测试。
- 不改动首页其余内容、分页与筛选。