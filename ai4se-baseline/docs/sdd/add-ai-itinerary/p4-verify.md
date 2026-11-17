# P4 验证记录 — add-ai-itinerary

- **Change：** `add-ai-itinerary`（REQ-017 / AI 智能行程推荐：基于地点、预算和天气生成游玩路线）｜ **阶段：** P4（实现 / 本地验证 / G2）
- **日期：** 2026-11-17｜ **记录人：** Jay（AO）（第二签署人 Neal（VL）；IO WAYNE 复核需求口径）

## 1. 阶段目标

把 P3 设计（design / atdd / tasks）按 T1–T8 落成可运行实现并完成本地验证：TDD red → green；技术边界诚实性（高德管地图/路线、Open-Meteo 管天气、AI 管推荐，不伪造数据）；契约 0.12.0 门禁；G2（VL Neal）签署。T9（P5 归档前收口）按发起人指示不执行、不归档。

## 2. 产出

| 工件 | 结论 |
|---|---|
| 后端实现 | 天气代理（WeatherProperties/Config/Service/Controller，Open-Meteo daily 归一 + WMO 文案 + 日期窗口）；AI 生成代理（AiProperties/Config/Service/Controller，generate 内自取天气先于 AI、失败即终止，DeepSeek 调用 + JSON 校验 + reduce_budget）；快照保存与归属（AiItineraryEntity/mapper/pojo + POST/GET）；`trip_plans.ai_itinerary_id` 链接（V18 + TripPlanServiceImpl 发布校验）；`/_AMapService/v3/log/init` JSONP 包裹 |
| 前端实现 | `AiPlannerPage.tsx` 三栏（条件表单三方式选点 + 门控生成 + 分服务 Loading/Error/Retry + 天气/预算/Tips 卡 + 时间轴编辑 + 编号 Marker + 保存闭环）；纯逻辑 `ai/`（plannerForm/budgetMath/poiResolve/itineraryEdit/snapshot/aiMessages）；`AmapService` transit 三结构兼容 + `appendStepPath`；`route.ts` `?ai=` 解析；TripCreatePage 预填 + TripDetailPage 徽标摘要；App/AppShell 路由与 rail；styles.css `.ai-planner-*` 令牌 |
| 契约 / 迁移 | `openapi.yaml` 0.12.0 四接口 + schema + `ai_itinerary_id` 可空 + 错误码枚举；`V18__ai_itineraries.sql`；`OpenApiTest` 门禁断言 |
| 测试 | 后端 `mvnw verify` **288/288**（含 proxy JSONP 2 用例）；前端 **298/298**（含 transit 三结构 8 用例）+ typecheck 0 errors + build 成功；E2E `ai-planner.spec.ts` A1–A12 **12/12**（fresh DB 终复跑） |
| `docs/ai4se-plugins/20261117-144000-local-verify-report.md` | 命令/结果/偏差裁决/走查明细/七项发现修复/冒烟/数据卫生/债务 |
| `openspec/changes/add-ai-itinerary/g2-decision.md` | **Pass with documented debts**（AO Jay / VL Neal / IO WAYNE 签署） |
| `docs/preview/add-ai-itinerary/` | 9 张走查截图（1440/768/390 × 浅/深 + 预填 + 详情）+ `walkthrough-report.json` |
| `tasks.md` | T1–T8 全勾选；T9 保留未执行 |

## 3. 关键验证决策（摘要）

1. **验收口径（发起人裁决）：** 本 change G2 验收 = ai-planner A1–A12 全数 Pass（12/12）+ 其余非地图套件全绿无回归；全量 run3 中 map/trips 21 红为 `refine-trip-map` 并行既有破坏（git 证据 `cf8a00a`/`b9e4f42` 为 P0 切点祖先），记录偏差、不修旧 spec，留给 `refine-trip-map` 更新。
2. **transit 根因闭环（D-02 兑现）：** 真实 SDK 2.0 `Transfer` 回调交付 `plans[]`（path LngLat[] / time / 数值 cost），非旧 `routes[0].transits` 亦非 REST `route.transits`；回调拦截 + 响应体 dump + node 模拟解析定位；`firstTransit`/`parseTransitLeg` 三结构兼容，+8 单测先 red 后 green；走查 run5 transit 17 公里/1h54m 高德实测验证。
3. **诚实性（技术边界）：** 距离/时间全部高德实测并标注来源；天气 Open-Meteo 真实预报实际参与推荐（雨天室内优先 + 装备建议）；预算无真实价格恒标「AI 估算」；POI 解析失败标「未定位」不伪造坐标；天气/AI 失败即终止 + Error/Retry 不伪造（L-02）。
4. **保存闭环（L-01/L-05）：** 快照为用户资产保留，发布失败携 `?ai={id}` 重试；详情徽标 + 摘要加性渲染失败只隐藏；非本人快照 400。
5. **数据卫生：** 本地全量需 fresh SQLite（债务 1）；本轮两次 fresh（备份 t8-walk / t8-final 后删库 Flyway V1–V18 重建）；走查/诊断临时脚本用毕删除（沿用 r2 `tmp-r2-shots.mjs` 先例）；真实 key 仅 gitignore 本地文件，冒烟证据 json/log 不入库。
6. **环境：** 后端须沙箱外运行（真实 key 经 `application-local.yml` 注入）；企业防火墙对 `api.open-meteo.com` 间歇拦截为环境因素非产品缺陷，走查安排在放行窗口。

## 4. 签署

| 对象 | 签署位 | 批准人 | 日期 |
|---|---|---|---|
| g2-decision.md | G2 AO | Jay（AO） | 2026-11-17 |
| g2-decision.md | G2 VL | Neal（VL） | 2026-11-17 |
| g2-decision.md | G2 IO | WAYNE（IO） | 2026-11-17 |

批准来源：发起人 2026-11-17 弹窗确认「批准 G2（Jay+Neal+WAYNE）」，授权代签本轮 G2 全部 3 个签署位。

**阶段结论：G2 Pass。** 按发起人指示不执行 P5、不归档。下一步：P4 阶段提交 → pull → push。

## 5. 提交与验证记录

- **validate（本轮实测）：** `openspec validate add-ai-itinerary --strict` → valid（tasks.md 勾选改动后复核）；`@redocly/cli lint openapi.yaml` → 0 error / 15 warnings（既有口径）。
- **build（plans 修复后终复跑）：** `npm run build` 成功 11.1s，仅既有主 chunk >500 kB 警告。
- **E2E 终复跑：** fresh DB 上 `npx playwright test ai-planner` → 12 passed（2.7m，`e2e-t8-ai-final2.log`）。
- **阶段提交：** `feat(p4): add-ai-itinerary AI recommendation, weather proxy and snapshot save loop`；提交前核对分支 `feature/add-ai-itinerary`，只 stage 本 change + 收编路径（并行 AMap SDK 化在途改动按发起人裁决收编）；排除工作区根 `../.gitignore` / `../.vscode/tasks.json`、preview 图片删除（D 不 stage）、t8-*.json/log 证据、备份 db。
- **push 前 pull：** `git pull --no-rebase --autostash --no-edit origin main`（P2 偏离③口径，禁 rebase/force push；`--no-edit` 防 vim 交互阻塞，偏离④教训）。
- **收编说明：** 并行会话 AMap SDK 化在途文件（AmapConfig/AmapProxyController/TripPlan* 契约字段/application.yaml/README/backend/.gitignore 等）随本阶段提交入库；preview 图片删除属并行会话未触碰。

## 6. 合并集成 addendum（push 前 pull 触发 main 合并）

P4 提交 `2e552fc` 后 `git pull --no-rebase --autostash --no-edit origin main` 触发与 main（`0979e916`，0.16.0）28 文件冲突（main 已落 add-trip-weather / add-experience-photos / add-trip-cancel / add-credit-account / refine-detail-companions / refine-safety-report）。**发起人裁决（选项 A）：main 天气为唯一权威 + 并集其余冲突 + 全量重验后提交推送 + 记录契约偏离。**明细见 `docs/ai4se-plugins/20261117-144000-local-verify-report.md` §8。

- **契约偏离（天气改由 add-trip-weather 提供）：** 删重复天气类（WeatherText/WeatherTextTest）；AiItineraryServiceImpl 重构消费 main `WeatherService.forecast(WeatherQuery)`；天气改 main 嵌套 `WeatherForecast`（weather:WeatherDaily|null + reminders[]）；前端 `fetchWeatherForecast(destinationCode,date,point?)` 新签名 + AiPlannerPage/snapshot/TripDetailPage 嵌套适配；openapi 0.16.0 基 + AI 接口 → **0.17.0**；`V18__ai_itineraries` → **`V21__ai_itineraries`**（main V18–V20 占用）。
- **地图并集：** main 栅格底图 + SVG overlay 为权威，`AmapService` main 基 + transit 加性 port；`RouteLayer` 接线 numbers 编号（AC8）；styles.css/TripDetailPage 并集。
- **合并期修复：** ① AiItineraryServiceImpl 独立 MAPPER 补 SNAKE_CASE 策略（main 天气 POJO camelCase 组件绑定）→ 快照保存 400→201；② rasterMap.ts host 暴露栅格实例 + ai-planner.spec A1 `__amapClick` 重写为投影像素 pointer 事件（main 栅格取代 AMap.Map 矢量 stub）。
- **合并后重验：** 后端 `mvnw verify` **364/364** BUILD SUCCESS；前端 **363/363**（45 files）+ typecheck 0 + build 成功；E2E 全量 **143：121 passed / 22 failed**（ai-planner **12/12**，main 新增 credit/detail-companions/experience-photos/weather/weather-walkthrough 全绿）；**profiles.spec fresh DB 隔离 8/8** 证实全量 4 红为债务 1 污染；map 9 + trips 9 = 18 红归 refine-trip-map（china-map 级联依赖）偏差。真实天气 200（Open-Meteo 嵌套）验证。
- **验收口径达成：** ai-planner 12/12 + 非地图套件隔离全绿；22 红均非本 change 回归（18 refine-trip-map 偏差 + 4 债务 1 污染）。G2 结论维持 **Pass with documented debts**，新增契约偏离（天气权威转移 add-trip-weather）记录于 g2-decision.md addendum。
- **提交：** 20 冲突文件全解决 staged + 4 后端 AI 文件补 staged + 2 E2E 修复文件（ai-planner.spec/rasterMap.ts）staged；排除 `.vscode/tasks.json`（unstaged）/ t8-*.json（untracked）；`git commit --no-edit`（merge）→ push（pull 已先做）。

## 7. 第二波合并 addendum（merge 提交 c5b4e93 后 push 前再 pull）

第一波 merge 提交 `c5b4e93` 后 push 前再 pull，main 已推进到 `b50e416`（add-admin-console / trip-publish-options / UI refresh / V22+），触发 9 文件新冲突；沿用 standing ruling 并集解决。明细见 verify report §9。

- **并集要点：** TripPlan/TripCreateRequest/TripPlanServiceImpl/TripPlanStatusTest 同时携 `travelMode` + `aiItineraryId`；OpenApiTest 保留 AI + admin 两个完整门禁方法；api.ts/AppShell rail union；registry union；契约 **0.18.0**；迁移 `V21__ai_itineraries` → **`V24__ai_itineraries`**（main V21–V23 占用，fresh DB Flyway V1–V24 验证）。
- **合并期修复（main 既有客观缺陷，门禁阻断）：** ① openapi `loadAdminReportDetail` responses 重复映射键（main 自身即损坏，git 证据）修复为 AdminReportDetail 200 形状；② 6 处 admin schema `allOf:[$ref]+nullable` 无 type（redocly error，main 副本复现证实）补 `type: object` 保留 null 语义；③ 后端 verify 首跑失败为 shell 残留 SPRING_DATASOURCE_URL 覆盖 H2（环境非代码），清空后重跑绿。
- **重验：** 后端 **464/464** EXIT=0；前端 **394/394** + build 绿；E2E 全量 **150：119/31**（**ai-planner 12/12** + **admin 5/5**；31 红 = map9+trips8 refine-trip-map 偏差 + auth7+profile2+credit1 main UI refresh/admin 既有 E2E 债务（git 证据 spec 字节相同而 main 删 DOM）+ profiles4 债务 1 污染，隔离 fresh DB **8/8** 证实）；门禁 openspec strict **valid** + redocly **0 error / 21 warnings**。
- **验收口径达成，G2 结论维持 Pass with documented debts**（原签署不变，见 g2-decision.md Addendum 2）。提交：9 冲突 + V24 + openapi 修复 + 三报告 addendum staged → `git commit --no-edit` → push 前再 pull → push。

## 8. 第三波合并 addendum（merge 提交 49b4436 后 push 前再 pull）

第二波 merge 提交 `49b4436` 后 push 前再 pull，main 又推进到 `3db5b14`（add-experience-like-credit REQ-023：体验点赞 + 阶梯信用），仅 openapi.yaml Error 枚举 1 冲突，其余 auto-merge；沿用 standing ruling。明细见 verify report §10。

- **版本再演进：** Error 枚举 union（EXPERIENCE_NOT_FOUND + AI 三码）；契约 **0.19.0**（OpenApiTest 3 处断言同步，13 门禁方法完整）；迁移 `V24__ai_itineraries` → **`V25__ai_itineraries`**（main V24 likes 占用，fresh DB Flyway V1–V25 验证）；ai-planner.spec 合并零改动。
- **合并期修复：** target/classes 残留旧 V24 迁移产物致「more than one migration with version 24」，清陈旧产物后重跑绿（构建卫生）；真实天气 502 为 firewall 拦截窗口（G2 观察项，产品失败即终止不伪造）。
- **重验：** 后端 **495/495** EXIT=0；前端 **401/401**（52 files）+ build 绿；E2E 全量 **154：123/31**（**ai-planner 12/12** + **experience-likes 3/3** + admin 5/5 + credit 9/9；31 红 = map9+trips9 refine-trip-map 偏差 + auth7+profile2 main UI refresh 债务 + profiles4 污染，隔离 fresh DB **8/8** 证实）；门禁 openspec strict **valid** + redocly **0 error / 21 warnings**。
- **验收口径达成，G2 结论维持 Pass with documented debts**（原签署不变，见 g2-decision.md Addendum 3）。提交：openapi + OpenApiTest + V25 + 三报告 addendum staged → `git commit --no-edit` → push 前再 pull → push。

## 9. 第四波合并 addendum（merge 提交 8edd99b 后 push 前再 pull）

第三波 merge 提交 `8edd99b` 后 push 前再 pull，main 又推进到 `91f9bce`（add-traveler-recommendation：可解释同行者推荐），仅 styles.css 1 冲突（EOF 追加块碰撞），其余 auto-merge；沿用 standing ruling。明细见 verify report §11。

- **并集要点：** styles.css node 字节并集（公共前缀 8445 行 + `.ai-planner-*` + `.recommendation-*`，9139 行）；契约 **0.20.0**（OpenApiTest 4 处断言同步，14 门禁方法完整）；V25 无碰撞；main 新测试 3 处构造调用补 `aiItineraryId` 尾参 null（auto-merge fallout，同既有 union 口径）。
- **重验：** 后端 **514/514** EXIT=0；前端 **406/406**（53 files）+ build 绿；E2E 全量 **161：129/32**（**ai-planner 12/12** + **traveler-recommendation 7/7**；32 红 = map9+trips9 refine-trip-map + auth7+profile2 main UI refresh 债务 + **profiles:37 main traveler-recommendation 新偏差**（spec 字节相同而 main 详情页 recommendation 块致按钮双元素 strict mode，隔离两次均红，git 证据）+ profiles4 污染隔离转绿）；门禁 openspec strict **valid** + redocly **0 error / 21 warnings**。
- **验收口径达成，G2 结论维持 Pass with documented debts**（原签署不变，见 g2-decision.md Addendum 4）。提交：styles.css + openapi + OpenApiTest + 3 测试修复 + 三报告 addendum staged → `git commit --no-edit` → push 前再 pull → push。

## 10. 第五波合并 addendum（merge 提交 7b7706a 后 push 前再 pull）

第四波 merge 提交 `7b7706a` 后 push 前再 pull，main 又推进到 `8fdb4e4`（add-credit-exit-restriction REQ-025：退出信用惩罚 + 低信用限制），6 文件 16 冲突区，其余 auto-merge；沿用 standing ruling。明细见 verify report §12。

- **并集要点：** TripPlanServiceImpl `AiItineraryService` + `CreditRestrictionGuard` 并存（create 三守卫）；App.tsx `CreditProvider` 包裹 + aiPlanner 路由 + aiItineraryId prop；TripCreatePage imports/签名并集；TripDetailPage 去 unused leaveTrip + aiSummary/CreditRestrictedNotice 并集；openapi 6 区 nullable 键序碰撞取 ours 避重复键；styles.css node 字节并集（.ai-planner + 补 } 闭合 @media + credit + .recommendation 仅一份，9218 行，括号 1321/1321）；契约 **0.21.0**（OpenApiTest 4 断言）；迁移 `V25__ai_itineraries` → **`V26__ai_itineraries`**（main V25 credit_enforcement 碰撞，fresh DB Flyway V1–V26）；main 新测试 2 处构造补 `aiItineraryId` 尾参 null。
- **重验：** 后端 **540/540** EXIT=0；前端 **406/406**（53 files）+ build 绿；E2E 全量 **168：134/34**（**ai-planner 12/12** + **credit-exit/restriction/cancel-reason 7/7** + **traveler-recommendation 7/7**；34 红 = map9+trips9 refine-trip-map + auth7+profile2 main UI refresh 债务 + profiles:37 main traveler-rec 稳定债务 + **污染 6**（profiles 13/51/88/102 + detail-companions:122 + safety-report:148，隔离均转绿）；profiles 单跑 fresh DB **7/8**）；门禁 openspec strict **valid** + redocly **0 error / 23 warnings**。
- **验收口径达成，G2 结论维持 Pass with documented debts**（原签署不变，见 g2-decision.md Addendum 5）。main credit-exit E2E 7/7 全绿证合并未破坏共享功能；34 红均非本 change 回归。提交：6 文件冲突 + openapi + OpenApiTest + V26 + 2 测试修复 + 三报告 addendum staged → `git commit --no-edit` → push 前再 pull → push。