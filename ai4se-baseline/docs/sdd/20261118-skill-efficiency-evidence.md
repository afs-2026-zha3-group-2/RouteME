# SDD 提效 skill：问题、用法与前后对比依据

日期：2026-11-18
用途：后续汇报的权威依据文档。每个 skill 回答三个问题——解决什么问题（优化前痛点）、怎么使用、优化后提效在哪里；所有数字与案例均挂证据出处，未经实测的耗时不虚构。
配套：方案报告 `_ao_ppt_build/20261118-SDD提效与冲突合并方案报告.md`、落地记录 `_ao_ppt_build/20261118-SDD提效落地记录.md`、六份使用记录 `docs/reviews/20261118-skill-usage-sdd-*.md`。

---

## 0. 总览

| skill | 一句话问题 | 使用入口 | 优化后核心变化 |
|---|---|---|---|
| sdd-merge-main | 合并靠个人经验摸索，并发环境状态漂移 | 用户要求合并分支时自动按规程执行 | 六步固定作业程序，漏项由全量重验兜底 |
| sdd-id-allocate | 编号只看 main 不看队友在途分支，反复顺延 | P1 起草时预分配；合并前跑 check | 撞号在 P1/CI 拦截，顺延有机械清单 |
| sdd-sign-ledger | 签署状态散落各报告，G2 积压不可见 | 一条命令生成台账 | 39 个 change 的缺签位一次列清 |
| sdd-worktree-ops | worktree 清理经验在人脑里，误杀/回退风险 | 清理分支/worktree 时按规程执行 | 快照先行 + 精确停进程 + 旁路拷贝判新旧 |
| sdd-e2e-debt-baseline | 已知红每轮 E2E 重新人工归因 | E2E 跑完一条命令 diff | NEW/BASELINE/RESOLVED 秒级三分类 |
| sdd-archive-queue | 归档依赖靠表格备注人肉维护 | 一条命令算队列 | 拓扑序 + 就绪度可计算，只排序不越权归档 |

---

## 1. sdd-merge-main — 合并主链路

**解决什么问题（优化前）**
- 合并经验只存在于个人记忆：admin-dashboard 合并时 8 个文件冲突，裁决规则（版本取谁、类型并不并）每次现场讨论（方案报告 §2.2、§7）。
- 并发会话环境下状态在命令之间漂移：本项目实测出现过「并发会话已替我方提交推送暂存的合并结果」「会话期间 origin/main 两次前进」，不先快照就会重复提交或覆盖他人工作（落地记录 §2、合并记录 §6）。
- auto-merge 无冲突标记不等于语义正确：本次合并实测钩子错位（详见 §1 提效证据）。

**怎么使用**
- 触发：用户要求「把分支合并进 main / 解决冲突 / 合并后重验」。
- 规程六步：快照（fetch + worktree list + status）→ 祖先校验定 fast-forward 或三方合并 → 撞号预检 → 按文件类型冲突 playbook 裁决 → 全量五项重验 → push 前 pull 校验、不自动归档。
- 文本依据：[SKILL.md](../../.agents/skills/sdd-merge-main/SKILL.md)。

**优化前后对比（可核查的行为差异）**

| 维度 | 优化前 | 优化后（2026-11-18 实测） |
|---|---|---|
| 裁决方式 | 逐文件现场讨论 | playbook 机械裁决：openapi 取更高 minor + 并集、OpenApiTest 单一常量、types/App/styles 并集、索引双行保留 |
| 并发漂移 | 靠运气发现 | 每轮强制快照；本次两轮并发推送（growth 第五次顺延、origin/main 两个 fix）均被快照捕获并二次合并，无重复提交 |
| 语义错误 | 无冲突标记即放行 | 全量重验暴露钩子错位（notifyServiceClosed 落进 resolve + 测试调已删方法编译失败），修复后 780/780 绿 |
| 收口 | push 前 pull 靠自觉 | 规程步骤：本次 push 前复核 11 ahead / 0 behind |

**提效口径说明**：方案报告曾设「单分支合并端到端 <30 分钟」目标；本次是 6 分支 + 两轮并发追赶 + 语义修复的复合场景，未单独计时，**不引用未实测的耗时数字**。可引用的结论是：同等复杂度合并从「半天摸索」（admin-dashboard 历史案例，方案报告 §3 S1）变为照单执行且零漏项。
证据：[使用记录](../reviews/20261118-skill-usage-sdd-merge-main.md)、[合并记录](20261118-merge-all-branches.md)、pitfall 记忆（auto-merge 钩子错位）。

## 2. sdd-id-allocate — 编号预分配与撞号检测

**解决什么问题（优化前）**
- 历史顺延案例（方案报告 §2.1，全部来自 registry/索引真实记录）：add-credit-recovery 四次顺延（REQ-022/S22→027/S28）、add-report-credit-deduction 两次、add-user-profiles 两次、add-growth-level 五次（REQ-029/S30→033/S34）。
- 根因：分配只看 main，不看队友在途分支；撞号在合并冲突最忙时刻才现场发现。
- 每次顺延要改 registry、stories、intents、requirements、proposal、Delta Spec、阶段记录里的全部编号引用。

**怎么使用**
- P1 起草 proposal 时一次性预分配 REQ/S/Flyway/契约 minor，写入 allocation.md；在途分支的号也算占用。
- 合并前：`node ai4se-baseline/scripts/check-id-collisions.mjs --root .`（CI spec-lint job 每次 push/PR 强制跑）。
- 撞号裁决：后到者顺延，只改后到者自己的工件，历史快照保留原号（`@rule:id-allocation`）。

**优化前后对比**

| 维度 | 优化前 | 优化后（2026-11-18 实测） |
|---|---|---|
| 撞号发现时机 | 合并时现场发现 | P1 预分配 + 合并前 check + CI 拦截；负向探针实测：放入重复 V36 → FAIL exit 1，删除 → PASS exit 0 |
| 顺延执行 | 手工全文搜索替换 | check 输出占用清单与 next 号（REQ-035/S36/V37/0.32.0），按清单改 |
| 新增撞号入库 | 无门禁 | CI 编号 lint 挡住；本次合并全程 0 新增撞号入库（3 条历史基线豁免） |

**诚实口径**：本次合并仍处理了 2 个 change 的顺延（growth 第五次、service-close REQ-034/S35/V36）——这些是 skill 落地**前**已分配的历史撞号，属存量清理；skill 的增量价值是「此后新 change 在 P1/CI 即拦截」，存量清零需要时间验证，不宣称已达成「顺延次数=0」。
证据：[使用记录](../reviews/20261118-skill-usage-sdd-id-allocate.md)、docs/sdd/README.md 变更索引顺延链、`scripts/id-collision-baseline.json`。

## 3. sdd-sign-ledger — 签署状态台账

**解决什么问题（优化前）**
- G2 签署积压：方案报告盘点时至少 8 个 change 标「G2 待签」，实现早已完成，卡在同一签署人；状态散落在各评审报告签署段与索引备注，催办要逐份翻查（方案报告 §2.3）。
- 签署询问每回合重复：同一 change 多份工件要多轮问答。

**怎么使用**
- `node ai4se-baseline/scripts/sign-ledger.mjs --root .` → 生成 `docs/sdd/sign-ledger.md`（生成物不手改）。
- 催签时读台账行，把同一 change 全部缺签位合并成一次提问；先按记录人姓名规则确认当前开发者；批准后才落签署行。工具本身不代签。

**优化前后对比**

| 维度 | 优化前 | 优化后（2026-11-18 实测） |
|---|---|---|
| 状态可见性 | 逐份报告翻查 | 一条命令：39 changes × 工件 × G1/G2/G3 矩阵，22 个 G2 缺口一次列清 |
| 催办方式 | 每回合零散问答 | 按 change 聚合一次问齐（规程固化） |
| 数字变化 | 盘点时 ≥8 个 G2 待签 | 台账实测 22 个（口径扩大到全部 39 个 active change 的缺签/缺文件；积压可见是催办前提，清零靠后续人工签署） |

证据：[使用记录](../reviews/20261118-skill-usage-sdd-sign-ledger.md)、[sign-ledger.md](sign-ledger.md)。

## 4. sdd-worktree-ops — 多工作树运维

**解决什么问题（优化前）**
- 多 worktree + 并发会话环境，清理经验只在个人记忆：每个新会话重新摸索命令序列（方案报告 §2.4）。
- 两类真实事故风险：按进程名批量杀会误伤 IDE/其他会话/E2E 后端；把旧基线旁路拷贝合回 main 造成回退（fixpublish 案例：v0.17.0/35 路径 vs main v0.22.0/57 路径，diff 方向全是删除较新功能）。

**怎么使用**
- 触发：清理分支/worktree、移除残留目录、worktree 删除被进程占用。
- 规程：操作前快照 → WIP 先 commit 保全 → worktree remove → 占用时按 trace.log PID + 端口反查精确停进程 → 旁路拷贝先 diff 判新旧（旧快照只删不合）→ 破坏性操作前经用户裁决。
- 分支清理：`merge-base --is-ancestor` 确认已并入 → `push origin --delete` → `fetch --prune`；队友在途分支不清理。

**优化前后对比**

| 维度 | 优化前 | 优化后（2026-11-18 实测） |
|---|---|---|
| 清理 6 个已合并分支 | 经验依赖个人 | 逐个祖先校验后一次删除，远端仅剩 main，零误删 |
| worktree 生命周期 | 新会话重新摸索 | 演练全程照规程：快照→建→验→移除 exit 0→复核零残留 |
| 进程占用 | 曾按名误杀风险 | 精确停进程分支固化（历史实战：mapfix PID 19768/端口 8095 精确停用） |

证据：[使用记录](../reviews/20261118-skill-usage-sdd-worktree-ops.md)、[合并记录 §7](20261118-merge-all-branches.md)、项目记忆（worktree 清理全流程 / fixpublish 判定）。

## 5. sdd-e2e-debt-baseline — E2E 已知债务基线

**解决什么问题（优化前）**
- 全量 E2E 带 33 条已知红（历史实测 173:140/33），每轮都要重新人工归因「是既有债务还是本次引入」（方案报告 §2.4）。
- 「33 红均为已知债务」这句话过去只是人工结论，机器不可验证。

**怎么使用**
- E2E 用 JSON reporter 跑（fresh DB 前提）：`npx playwright test --reporter=json > report.json`，或私有栈 `e2e-shard.mjs --json-dir`。
- 归因：`node ai4se-baseline/scripts/e2e-debt-diff.mjs --report <path> --root .` → NEW（必须修或用户裁决）/ BASELINE（引用归因不重查）/ RESOLVED（提示销账）。
- 入库纪律：无真实归因不得进 entries；未归因的观察红记 pending。

**优化前后对比**

| 维度 | 优化前 | 优化后（2026-11-18 实测） |
|---|---|---|
| 归因方式 | 每条红人工翻历史 | 一条命令秒级输出：smoke 16 例 = 15 过 / 1 红，diff 判 new=1 并 exit 1 |
| 结论可验证性 | 人工口径 | 机器口径 + pending 台账交叉核对（该红已登记 spec drift，单例复跑稳定复现，非本次引入） |
| 报告写法 | 「均为已知债务」口头断言 | `passed / failed (N baseline / M new)` + diff 输出为证，M>0 不得报 clean |

**诚实口径**：entries 基线目前为空（首跑归因入库待排期），本次验证走的是「工具判 NEW → 与 pending 台账交叉核对」路径；33 红的逐条入库销账是后续工作。
证据：[使用记录](../reviews/20261118-skill-usage-sdd-e2e-debt-baseline.md)、`e2e/known-failures.json`、`.tmp-e2e/skill-verify-report/shard1.json`。

## 6. sdd-archive-queue — 归档依赖队列

**解决什么问题（优化前）**
- 「归档需排在 add-admin-console 之后」等依赖散落在 26 行索引表的备注列，人肉维护、不可执行（方案报告 §2.3）。
- 归档准入（G2 已签 + 依赖已归档）没有统一检查，靠逐个翻 change。

**怎么使用**
- 依赖声明：change 目录 `archive-after.md`（缺失时回退解析索引备注）。
- `node ai4se-baseline/scripts/archive-queue.mjs --root .` → 生成 `docs/sdd/archive-queue.md`：依赖边 + 拓扑序（环报错）+ 逐 change 就绪度 + 「现在可归档」清单。
- 执行归档仍走人工批准 + openspec-archive-change，本工具只排序不归档。

**优化前后对比**

| 维度 | 优化前 | 优化后（2026-11-18 实测） |
|---|---|---|
| 依赖维护 | 表格备注人肉读写 | 声明式文件 + 脚本计算 |
| 「现在能归档谁」 | 逐个翻 change 核对 | 一条命令：39 active / 16 ready / 0 环 |
| 越权风险 | — | 默认不归档与项目约定一致，本次未移动任何 change |

证据：[使用记录](../reviews/20261118-skill-usage-sdd-archive-queue.md)、[archive-queue.md](archive-queue.md)。

---

## 7. 配套提效项（与 skill 协同，报告可一并引用）

| 项 | 优化前 | 优化后 | 证据 |
|---|---|---|---|
| 契约版本断言 | OpenApiTest 5 处硬编码版本号，升版逐处改 | 单一 CONTRACT_VERSION 常量，升版改一处 | 落地记录 §1-3；OpenApiTest 18/18 绿 |
| CI 门禁 | 仅 backend verify + frontend build/test 两 job | 四 job：新增 spec-lint（冲突标记/编号/openspec/redocly）与 e2e-smoke（fresh DB + 债务归因） | ci.yml；落地记录 §1-8 |
| 类型漂移 | types.ts 手写，前后端字段可能漂移 | `npm run gen:api-types` 从契约生成 + tsc 零错误 | 落地记录 §1-11 |
| 规则固化 | 编号/重验约定在记忆里 | `@rule:id-allocation`（规则 24→25）+ web-testing「合并后五项重验」 | 落地记录 §1-12 |

## 8. 汇报引用纪律

1. 数字只引用本文与三份源记录中有出处的；「半天→照单执行」是历史案例对照，不是本次计时。
2. 存量债务（历史撞号、22 个 G2 缺口、E2E pending 红）如实呈现为「已可见、待清理」，不宣称已清零。
3. 前后对比以行为对照表为题眼（本文各节表格），不写无证据的耗时百分比。
4. 面向大众的汇报材料另按既定口径加工（一页一重点、不出现真实人名、书面专业表述），本文是依据层不是讲稿层。