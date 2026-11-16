# P0 基线记录 — add-trip-publish

- **Change：** `add-trip-publish`（能力 `trip-plans` MODIFIED）｜ **故事：** S06 发布旅行计划（issue #8）｜ **需求：** REQ-002
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-16
- **记录人：** Jay（AO）

## 1. 阶段目标

确认 change 可以开工：规格树、规则载体、知识库槽位与 CI 管道都在仓库里可查，不依赖口头约定。

## 2. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 规格树 | `openspec/specs/`（含 `trip-plans`、`trip-companions`、`trip-experiences`）、`openspec/changes/`、`openspec/templates/`、`openspec/config.yaml` | 存在且自洽 |
| 长期规格权威 | `openspec/specs/trip-plans/spec.md` 已含「发布可被他人理解的旅行计划」Requirement | 本 change 以此为 MODIFIED 基线 |
| 规则载体 | `docs/knowledge/rules/_INDEX.md`（6 分类 / 23 条规则）、`docs/knowledge/rules/{architecture,process,quality,security,testing,documentation}/rules.md` | 覆盖分支、测试、管道、安全、SDD 工件 |
| 知识库 | `docs/knowledge/_INDEX.md`、`_LOG.md`、`architecture/README.md`、`interfaces/README.md` | 槽位可写 |
| 协作约定 | `ai4se-baseline/AGENTS.md`（仓库根、提交边界、知识库入口） | 存在 |
| CI | `.github/workflows/ci.yml`（backend verify + frontend build/test） | 存在 |
| CD | `.github/workflows/cd.yml`（构建镜像并发布 release） | 存在 |
| 验证命令 | `docs/feedback/verification-commands.md` | 存在 |

## 3. P0 DoV 检查（`checklists/p0.md`）

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在或显式延后 | Pass | `openspec/`、`docs/knowledge/`、`AGENTS.md` 均存在 |
| P0-2 | 规则覆盖分支 / 测试 / 管道 / 环境 / IaC / NFR | Pass | 23 条规则，IaC 以 CI/CD 工作流与 Dockerfile 体现 |
| P0-3 | `/sdd:p0` 序列技能可解析 | Pass | `commands/catalog.md` 中 repo-understand / bootstrap / rules-govern / quality-checklist 均为 ready |
| P0-4 | pack 隔离违规 | Skipped | 本 change 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | CI/CD 工作流已在主干运行（历史 run #81 成功） |

## 4. 阶段产出

- 本记录：`docs/sdd/add-trip-publish/p0-baseline.md`
- 阶段索引：`docs/sdd/README.md`
- 未新增代码或规格文件；P1 起才进入提案与规格。

## 5. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | 准入 P1；S06 进入本迭代排期 | 2026-11-16 |
| IO | Wanye | REQ-002 为需求来源，无跨能力前置依赖 | 2026-11-16 |
| AO | Jay | 基线证据可复现；同意进入 P1 | 2026-11-16 |

**阶段结论：Pass**

## 6. 准入 P1 的条件

- `proposal.md` 写清 in-scope / out-of-scope（已在 P1 提交）。
- 需求与故事可追溯到 REQ-002 与 issue #8。

## 7. R2 基线：发布页可用性复核（2026-11-16）

用户评审 S06 发布页后提出四项缺陷，本轮（R2）先复现再修。

| 缺陷 | 复现证据 | 结论 |
|---|---|---|
| 目的地无法点击选取 | 打开 `#/trips/new` 点击目的地控件：DOM 中 `.ant-cascader-dropdown` 为 `display:block; visibility:visible`，但 `getBoundingClientRect()` 为 `x=-5670, y=-9070`（视口外），截图中看不到下拉面板 | 弹出层定位失效，必须显式指定 `getPopupContainer` |
| 出发 / 结束日期为空 | 表单初始值 `startDate: ''`、`endDate: ''`，占位显示 `mm/dd/yyyy` | 默认今天，仍可修改 |
| 途经点地图丑且与目的地无关 | `PlaceMap` 以 `viewBox="0 0 100 100"` + `preserveAspectRatio="none"` 铺满宽容器，land 被横向拉伸；16 个城市标签在珠海 / 中山 / 澳门 / 香港处重叠；未选目的地时仍然展示整张地图 | 地图按容器比例绘制，未选目的地不展示，选中后聚焦该市 |
| 布局与间距不自然 | 目的地控件宽度仅 142px（未撑满字段），日期两个控件与其它字段行高不一致，表单缺少分组，字段间距靠 antd `Space` 默认值 | 统一全宽控件、字段分组与间距 |

环境：antd `^6.7.0`、React 19、视口 571×885（移动端窄屏复现），后端 `main@d5d70fa` 运行时。

### R2 的 P0 复核

| id | 检查 | 结论 |
|---|---|---|
| P0-1 | 基线骨架 | Pass（同 §3） |
| P0-2 | 规则载体 | Pass（`@rule:web-coding-style`、`@rule:web-testing` 覆盖本轮改动） |
| P0-3 | 技能可解析 | Pass |
| P0-4 | pack 隔离 | Skipped（不改 pack） |
| P0-5 | 管道骨架 | Pass（CI run #89 成功） |

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | 接受 R2 四项缺陷进入修复排期 | 2026-11-16 |
| IO | Wanye | 四项均属 S06 发布页体验，不新增需求 | 2026-11-16 |
| AO | Jay | 复现证据完整，承担 R2 实现 | 2026-11-16 |

## 8. R3 基线：字典全国化后的返工（2026-11-16 13:35）

远端 `a13416c` 把目的地字典换成全国省市（`area/area-codes.json` + `area/AreaCascader`）后，R2 的最小切片成了遗留物，并带来两处可见缺陷。

| 项 | 复现 | 结论 |
|---|---|---|
| 提示与状态不符 | 选「北京市 / 市辖区」后，途经点区域显示「先选目的地，再按城市点选途经点。」 | 需要区分「未选目的地」与「目的地无离线点位」 |
| 无地图 | `mapCityForCode('110100')` 依赖 16 城切片，返回 `undefined` | 映射改为读取共享字典，未覆盖城市显式说明 |
| 前端重复字典 | `areas/areaCatalog.ts` 的 `AREA_PROVINCES` / `DESTINATION_OPTIONS` / `cityByCode` / `codesForCityName` 已无调用方 | 删除，仅保留代码→地名库城市映射 |
| 后端死代码 | `constant/AreaConstant`、`pojo/AreaCity` 仅自引用；`TripPlanServiceImpl` 两条 import 未使用 | 删除，名称派生统一走 `area/AreaDictionary` |

### R3 的 P0 复核

| id | 检查 | 结论 |
|---|---|---|
| P0-1 | 基线骨架 | Pass（同 §3） |
| P0-2 | 规则载体 | Pass（`@rule:web-coding-style`、`@rule:java-patterns` 覆盖删除与重命名） |
| P0-3 | 技能可解析 | Pass |
| P0-4 | pack 隔离 | Skipped |
| P0-5 | 管道骨架 | Pass（CI run #98 成功） |

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | 接受 R3 排期 | 2026-11-16 |
| IO | Wanye | 全国点位缺失属既有边界，不扩 scope | 2026-11-16 |
| AO | Jay | 复现证据完整，承担 R3 实现 | 2026-11-16 |