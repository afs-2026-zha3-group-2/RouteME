# G3 decision — add-trip-experiences

- **Gate:** G3（Merge & Archive）
- **Change:** `add-trip-experiences`（capability `trip-experiences`，REQ-004）
- **Timestamp:** 2026-11-15T18:12+0800
- **Recorded by:** Jay（AO / current developer）

## Inputs

| Artifact | Path / ref | Result |
|---|---|---|
| Living Spec merge | `openspec/specs/trip-experiences/spec.md` | 已创建，含 6 条 Requirement；Purpose 已填写 |
| Archive | `openspec/changes/archive/2026-11-15-add-trip-experiences/` | 自包含：proposal、delta spec、design、tasks、ATDD、AC/DoV、G1/G2、summary |
| Change summary | 归档目录 `summary.md` | intent / shipped / verify / risks / links 齐全 |
| KB update | 人工检查相对链接 | Pass（`no broken links`）；`scripts/kb-lint.sh` 仍为占位脚本，未声称已执行 |
| G2 | 归档目录 `g2-decision.md` | Pass（VL Neal）；CI #60/#61/#63 全绿，#62 失败已记录并修复 |
| CI | #60 https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43701442749 ｜ #61 https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43701875651 ｜ #63 https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43702117112 | Success |

## Findings

| 维度 | 结论 |
|---|---|
| Merge | `openspec archive` 成功：新增 `trip-experiences` living spec（+6 requirements），无冲突 |
| Conflicts | 无并行 change 冲突；`trip-plans`/`trip-companions` 只经既有查询与服务方法复用，未改其对外契约 |
| Archive completeness | 8 个工件 + `specs/trip-experiences/spec.md` 全部在归档目录，任务 14/14 完成 |
| KB | 相对链接 0 断链；索引与日志人工同步（`_LOG` 新增 `kb.routeme.trip-experiences`） |
| Harness / Rules evolve | 建议新增一条提交纪律：提交前检查未跟踪产物（空的 `logback-spring.xml` 曾致 CI #62 失败），可作为后续 `git-commit-conventions` 的 evolve 输入 |

## Decision

**Pass**

## Conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| KB lint 仍未配置，知识库校验为人工 | Jay | 补 `scripts/kb-lint.sh` 实现或改用 Node 脚本 |
| 真实认证替换 `X-User-Id` 演示桩 | Jay | 生产化 change |
| 原型 `draftFromSource` 复制人数待修 | Jay | 同步原型时 |
| 体验内容审核/举报目标 | Jay | 后续扩展 `/reports` 的 `target_type` |
| 提交前检查未跟踪文件 | Jay | 下一次 change 起；可写入规则 |

## Approvers

| 角色 | 姓名 |
|---|---|
| SA | Jacky、Karena |
| AO（附件建议，不替代 SA 决定） | Jay：把「提交前检查未跟踪产物」纳入 `git-commit-conventions`；体验审核边界写入后续安全评审 |
| VL | Neal |
| IO | Wanye |
| SM | Lewis |

签署来源：用户于 2026-11-15 提供角色名单并确认继续推进 verify/archive。