# P4 实现与验证记录 — add-trip-publish

- **Change：** `add-trip-publish`｜ **阶段：** P4（Apply & verify / G2）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

按 ATDD 完成实现、跑通本地验证与 CI，并由 VL 完成 G2 签署。

## 2. 实现摘要

| 层 | 改动 | 提交 |
|---|---|---|
| 前端表单 | `TripCreatePage`：`Field` 改为 `<label htmlFor>`；控件 `id`；错误文案 `id = <field>-error`；控件 `aria-invalid` / `aria-describedby`；标签容器 `role="group"` | `4c92fbf` |
| 前端控件 | `PlacePicker`：新增 `ariaLabel` / `inputId` / `invalid`，未传时保持原行为 | `4c92fbf` |
| 测试 | `tripForm.test.ts`：一次提交报告全部必填错误；`capacity = 2.5` 拒绝 | `4c92fbf` |
| 端到端 | `trips.spec.ts`：语义选择器；新增「空表单逐项报错且不跳转」；断言跳转地址、发布者归属、首页可检索 | `4c92fbf` |
| 后端 / 契约 | 无代码改动；校验与契约已满足场景 | — |

实现提交 `4c92fbf` 已通过 `a37da5e` 合入 `main`；本阶段提交补记验证与 G2 签署。

## 3. Red → Green 证据

| 步骤 | 观察 |
|---|---|
| Red | `npx playwright test tests/trips.spec.ts -g "publishes a trip"` → `locator.fill` 在 `getByLabel('标题')` 超时（30.1s） |
| Green | 完成字段命名与错误绑定后同一用例通过（3.7s）；新增字段级错误用例通过（1.8s） |

完整输出见 [`20261116-100500-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-100500-local-verify-report.md)。

## 4. 验证结果

| 命令 | 结果 |
|---|---|
| `cd RouteME/backend; .\mvnw.cmd -B -o test` | Tests run: 152, Failures: 0, Errors: 0 |
| `cd RouteME/frontend; npm test` | Test Files 9 passed / Tests 67 passed |
| `cd RouteME/frontend; npm run build` | 成功（仅 chunk 体积提示） |
| `cd RouteME; npx @redocly/cli lint openapi.yaml` | valid，0 error / 7 既有 warning |
| `cd RouteME/e2e; npx playwright test tests/trips.spec.ts -g "publishes a trip\|blocks publishing"` | 2 passed |
| CI run [`43790134080`](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43790134080) | Success |
| CD run [`43790222617`](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43790222617) | Success（`build-a37da5e`） |

## 5. P4 DoV 检查（`checklists/p4.md`）

| id | 检查 | 结论 |
|---|---|---|
| P4-1 | 本地验证报告存在 | Pass（`docs/ai4se-plugins/20261116-100500-local-verify-report.md`） |
| P4-2 | 本地 Overall = Pass，或 Fail 且有签署豁免 | Pass |
| P4-3 | `phase=ci` 报告或等价人类确认 | Pass（CI run 43790134080） |
| P4-4 | `phase=cd` 部署后验证 | Pass（CD 成功发布） |
| P4-5 | 声称 G2 完成时有 `g2-decision.md` | Pass |
| P4-6 | Apply 与 Verify 分离，无自批门禁 | Pass（G2 由 VL Neal 签署） |

## 6. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | docs(p0): add-trip-publish baseline stage and sign-off |
| P1 | docs(p1): add-trip-publish intent stage and sign-off |
| P2 | docs(p2): add-trip-publish delta spec G1 and sign-off |
| P3 | docs(p3): add-trip-publish design tasks and sign-off |
| P4（实现） | `4c92fbf` feat(verify): add-trip-publish field-level publish feedback and S06 acceptance |
| P4（合并） | `a37da5e` Merge `feature/add-trip-publish` |
| P4（本阶段记录） | 本条提交 |

## 7. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 实现与 P3 任务一致；验证命令可复现；承担遗留项 | 2026-11-16 |
| VL | Neal | 独立复核验证报告与 CI；确认 11 条场景有对应断言；G2 Pass | 2026-11-16 |
| SA | Jacky、Karena | 实现未越出 Delta Spec；字段级提示符合验收 | 2026-11-16 |
| IO | Wanye | 收到残余风险清单（身份桩、e2e 债） | 2026-11-16 |
| SM | Lewis | G2 Pass，S06 可交付；P5 暂缓 | 2026-11-16 |

**阶段结论：Pass（G2）**

## 8. P5 状态

按用户 2026-11-16 指示：**暂不执行 P5**。归档时需补：`summary.md`、living spec 合并（`trip-plans`）、`docs/knowledge/` 登记、`changes/archive/2026-11-16-add-trip-publish/` 目录。

## 9. 修订：REQ-007 目的地代码化（P4 追加）

上文的 P4 证据对应「修订前」的发布链路（`destination` 中文名、契约 0.6.0），结论仍然成立，但已不足以覆盖当前 `add-trip-publish` 的范围。

| 项 | 修订前 | 修订后 |
|---|---|---|
| 请求字段 | `destination`（名称） | `destination_code`（6 位码，必须选到市） |
| 契约版本 | 0.6.0 | 0.7.0 |
| 发布页目的地 | 地图 `PlacePicker` | 省市级联 Cascader |
| 后端校验 | 目的地非空 | 代码必须是字典中的二级节点，否则 400 `INVALID_INPUT` |
| 新增断言 | — | 省级代码 / 不存在代码被拒；Cascader 语义定位 |

处置：

- 实现与验证证据记入 P4 追加提交与新的验证报告（`docs/ai4se-plugins/`），不覆盖本文件 §4 的历史结果。
- **G2 需重评**：`g2-decision.md` 追加「目的地修订」结论，契约版本与测试计数以修订后的提交为准。
- 归档仍按用户指示暂缓；归档顺序为 `add-destination-area-filters` → `add-trip-publish`。

### 9.1 修订实施结果（2026-11-16 11:35）

| 项 | 结果 |
|---|---|
| 实现提交 | `feat(p4): add-trip-publish publish destination code and contract 0.7.0` |
| 契约 | `openapi.yaml` 0.7.0，`destination_code` 必填、`^[0-9]{6}$`；redocly 0 error / 7 既有 warning |
| 后端 | `clean test` 156 通过（`TripControllerTest` 27 项，含省级码 / 未知码 / 缺失码拒绝） |
| 前端 | `npm test` 75 通过；`npm run build` 成功 |
| 端到端 | 发布 2 项通过（Cascader 选择 + 详情页目的地「珠海」） |
| 验证报告 | [`20261116-113500-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-113500-local-verify-report.md) |
| G1 / G2 | `g1-decision.md` 重评 Pass；`g2-decision.md` 追加修订 Pass |
| 遗留 | 最小字典切片（广东 14 城 + 港澳二级区）需由 `add-destination-area-filters` 替换为全国字典并持久化代码 |

## 10. 修订后的签署确认

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 复核目的地修订的验证证据，G2 重评后再签 | 2026-11-16 |
| AO | Jay | 承担目的地修订实现与本地验证 | 2026-11-16 |
| SA | Jacky、Karena | 确认修订后的验收口径（必须选到市、非法代码拒绝） | 2026-11-16 |

### 10.1 修订签署（证据落实后）

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 复核 `20261116-113500-local-verify-report.md`，G2 修订 Pass | 2026-11-16 |
| AO | Jay | 交付实现与回归结果；字典切片替换列为归档前复核项 | 2026-11-16 |
| SM | Lewis | 认可修订范围与遗留项安排 | 2026-11-16 |

## 11. R2 实施结果（发布页体验，2026-11-16 12:10）

| 项 | 结果 |
|---|---|
| 实现提交 | `feat(p4): add-trip-publish R2 defaults destination-scoped map and layout` |
| 目的地 | 弹出层挂字段容器后落在视口内（headless 430×900 实测 `x=35, y=310`）；控件撑满字段 |
| 日期 | 默认今天（本地日期），可改；空值仍走原校验 |
| 地图 | 未选目的地不渲染（引导文案代替）；选定后按该市包围盒缩放，`meet` 保比例，标签贪心避让，点/标签按视口缩放 |
| 布局 | 三段分组；行距 16 / 段距 24；移动端底部留白 88px |
| 后端 / 契约 | 无改动（156 通过，契约 0.7.0 不变） |
| 前端 | `npm test` 81 通过；`npm run build` 成功 |
| 端到端 | 发布 2 项通过；`trips` + `companions` 9 通过 / 3 条既有失败 |
| 验证报告 | [`20261116-121000-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-121000-local-verify-report.md) |
| G2 | `g2-decision.md` 追加 R2 Pass |

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 复核 R2 证据（截图 + e2e），G2 追加 Pass | 2026-11-16 |
| AO | Jay | 交付实现与回归结果 | 2026-11-16 |
| SM | Lewis | 认可 R2 交付；P5 仍暂缓 | 2026-11-16 |

## 12. R3 实施结果（字典全国化后的返工，2026-11-16 13:48）

| 项 | 结果 |
|---|---|
| 实现提交 | `refactor(p4): add-trip-publish R3 share the area dictionary and explain map coverage` |
| 映射 | 新增 `areas/gazetteerCity.ts`（共享 `area/areaOptions`，去「市」后缀，港澳归并）；删除 `areas/areaCatalog.ts` 与其测试 |
| 提示 | 未选目的地 → 「先选目的地…」；已选但无覆盖 → 「这个城市暂时没有离线点位…」；两种情况都不渲染地图 |
| 后端 | 删除 `constant/AreaConstant`、`pojo/AreaCity` 与两条未使用 import；名称派生统一走 `AreaDictionary` / `AreaNames` |
| 后端验证 | `clean test` 206 通过 |
| 前端验证 | `npm test` 105 通过；`typecheck` / `build` 通过 |
| 端到端 | 发布 / 未覆盖城市 / 字段级错误 3 项通过 |
| 验证报告 | [`20261116-134800-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-134800-local-verify-report.md) |
| 遗留关闭 | R2 的「最小字典切片待替换」已关闭 |

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 复核 R3 证据，G2 追加 Pass | 2026-11-16 |
| AO | Jay | 交付清理与回归结果 | 2026-11-16 |
| SM | Lewis | 认可 R3；P5 仍暂缓 | 2026-11-16 |

## 13. R4 实施结果（Ant Design 组件收敛，2026-11-16 15:05）

| 项 | 结果 |
|---|---|
| 实现提交 | `refactor(p4): add-trip-publish add-match-reason use ant design controls` |
| 规则 | `@rule:web-coding-style` 新增「组件选型（Ant Design 优先）」：日期 / 排序与枚举 / 数字 / 标签 / 进度 MUST 先用 antd，只有无组件或阻断性缺陷才允许原生或自绘，例外写进规则清单并在 P3 引用 |
| 日期 | `Input type="date"` → `DatePicker`（`YYYY-MM-DD`，默认今天与空值校验不变）；新增 `utils/dates.ts` 只在组件边界做 `Dayjs` ↔ 字符串转换 |
| 人数 / 预算 | `Input type="number"` → `InputNumber`（`precision=0`，表单状态仍是字符串，校验不变） |
| 标签 | 自绘 `button.chip` → `Tag.CheckableTag`；自定义标签用 `Tag closable` |
| 全局 | `ConfigProvider` 增加 `zhCN`，日期面板与 Modal 关闭按钮文案跟随中文 |
| 前端验证 | `npm test` 137 通过（含新增 `utils/dates.test.ts` 2 项与上游 `main` 的用例）；`npm run typecheck` / `build` 通过 |
| 端到端 | 重建种子库后全量 `npx playwright test`：53/54；`trips.spec.ts` 11/11 通过；唯一失败是既有断言 `profiles.spec.ts:23`（V13 已把周野职业改为「产品经理」，与本次改动无关） |
| 数据基线 | e2e 前把本地库备份到 `SqlLite/routeme.db.bak-20261116-1505`，删除后由 Flyway 重建种子库 |
| 看板 | S06 保持 P4，不归档 |

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 交付组件替换、规则文档与回归结果 | 2026-11-16 |
| VL | Neal | 待复核 R4 证据（G2 追加） | 待签 |
| SM | Lewis | 待确认 R4 范围；P5 仍暂缓 | 待签 |