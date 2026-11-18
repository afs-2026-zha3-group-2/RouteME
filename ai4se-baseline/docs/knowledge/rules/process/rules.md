# 流程规则（process）

本文件是该分类的权威正文。规则 ID 即二级标题，`@rule:<id>` 与索引中的 `#<id>` 都指向本文件里的同名小节。

## 适用范围

从规格到提交的工作流：规格先行、TDD 纪律、提交时机与 message、分支与 PR、评审方式。本文只定义「什么时候做什么」；工件目录与内容见 `@rule:sdd-artifacts`，代码与测试写法见 [quality](../quality/rules.md) 与 [testing](../testing/rules.md)。

冲突裁决：提交时机只看 `git-commit-conventions`，`tdd-cycle` 不定义提交边界。团队原则见 [README](../README.md#团队六条原则)。

## 规则总表

| ID | 规则 | 优先级 | 触发 | 适用栈 |
|---|---|---|---|---|
| spec-first | 先写规格再写代码 | Critical | always | — |
| artifact-review-gate | 每份工件生成后先评审、再按签署人矩阵签齐再进入下一步 | Critical | always | — |
| tdd-cycle | TDD Red / Green / Refactor 循环 | Critical | always | — |
| git-commit-conventions | 提交时机、commit message（必须英文）与提交前检查 | Critical | always | — |
| git-branching-and-pr | 分支、PR、换行符与回滚 | High | always | — |
| code-review-checklist | 评审方式与规则入口 | High | manual | — |

## spec-first

**先写规格再写代码。** 没有该变更的规格包，不写生产代码。

- 工件顺序：提案 → 规格（可选设计）→ 任务 → 实现 → 归档。
- PR 引用稳定的 Spec ID（change-id），与分支名一致。
- 与工具无关：OpenSpec、Speckit 只是载体，选定一个并记录，不把政策绑死在某个工具名上。

### 阶段门槛

| 阶段 | 必须满足 |
|---|---|
| P1 提案 | `proposal.md` 写清 in-scope 与 out-of-scope；范围含接口字段变化时同时开契约变更（`@rule:api-contract`）。 |
| P2 Delta Spec | 用 ADDED / MODIFIED / REMOVED 描述变更，每条带可验证验收场景（输入 → 预期输出）；MODIFIED 说明旧行为与新行为的差异。 |
| P3 任务 | `tasks.md` 一条任务只落一层，标注落点（backend / frontend / contract / docs）与验证命令；契约任务排在两端之前。 |
| P4 验证 | 测试方法与验收场景一一对应、术语一致；验证报告贴真实命令与输出摘要，不写「已验证」「测试通过」了事。 |
| P5 归档 | 改了团队做法就回写规则目录并升版本；`openspec archive` 后先提交归档，再跑基于 `git ls-files` 的仓库级检查（如 `scripts/verify-links.sh`），否则会因索引与工作区不一致断链。 |

### 检查项

| 检查 | 阻断点 |
|---|---|
| 是否有本 change 的规格包与 P1–P4 必需工件 | pr-merge |
| PR 是否引用 Spec ID | pr-merge |
| P1–P4 内容要求是否满足 | pr-merge |
| 归档提交是否先于 `git ls-files` 类检查 | pr-merge |

### 示例

```text
推荐：PR 引用 Spec ID: add-voucher-deduction，并附 openspec/changes/add-voucher-deduction/ 完整工件。
不推荐：功能分支只有生产代码，没有 Spec ID，也没有规格包。
```

### 例外

- `docs/**` 纯文档改动在组织策略允许时可豁免。
- 只修改 SDD 工作区自身（规格工具树）的元编辑不需要再套一层 change。

## artifact-review-gate

**每份工件生成后先评审、再按签署人矩阵签齐，才能进入下一步。** 覆盖四份工件：`proposal.md`、`specs/<capability>/spec.md`（Delta Spec）、`design.md`、`tasks.md`，以及它们对应的 `docs/reviews/` 评审报告。

### 签署人矩阵

| 对象 | 签署人 | 签署位 |
|---|---|---|
| `proposal.md` | WAYNE | 1 |
| `specs/<capability>/spec.md`（Delta Spec） | WAYNE | 1 |
| `design.md` | 当前开发者 + 1 名非当前开发者且非 WAYNE 的成员 | 2 |
| `tasks.md` | 当前开发者 + 1 名非当前开发者且非 WAYNE 的成员 | 2 |
| `docs/reviews/<yyyymmdd>-<change-id>-<artifact>-review.md`（工件评审报告） | WAYNE + 当前开发者 | 2 |
| `docs/reviews/<yyyymmdd>-<change-id>-all-specs-review.md`（全量评审报告） | WAYNE + 当前开发者 | 2 |

- 姓名取自 `docs/sdd/README.md#角色名册`；除 WAYNE 外的候选为 Jay / Lewis / Jacky / Karena / Neal。
- 同一份对象上一个人只占一个签署位：`design.md` / `tasks.md` 的第二签署人 MUST NOT 是当前开发者本人，也 MUST NOT 是 WAYNE。
- 当前开发者 MUST NOT 代签 WAYNE 的签署位；WAYNE 未签时该工件保持未批准，不得用 `AO` / `SA` / `IO` 等角色词占位。
- 签署位缺一即视为未批准；每份报告须写全每条「批准人 / 批准时间」，2 个签署位就写两条。

### 触发与顺序

1. 工件写完（或修改完）后，**同一个回合内**调用一次 `all-specs-review` 技能（见 `.agents/skills/all-specs-review/SKILL.md`），不得跳步进入下一份工件。
2. 评审报告写入 `docs/reviews/<yyyymmdd>-<change-id>-<artifact>-review.md`：
   - `<artifact>` 取 `proposal` / `spec` / `design` / `tasks` 四值之一。
   - 例：`docs/reviews/20261116-add-user-auth-proposal-review.md`。
   - 一份工件一份报告；修改后重评不得覆盖旧报告，用日期区分（同一天重评加序号，如 `-review-2.md`）。
3. 报告写完后**必须停下**，按签署人矩阵向当前签署人发起询问，一次问齐该工件的全部签署位（工件本身 + 对应评审报告）：
   > 本次 `<artifact>` 评审结论为 `<Pass/Partial/Fail>`。按签署规则：工件由 `<签署人>` 签署；评审报告由 WAYNE + 当前开发者签署。请给出批准人姓名与批准时间；若本工件是 `design` / `tasks`，请再指定 1 名非当前开发者且非 WAYNE 的第二签署人（候选：Jay / Lewis / Jacky / Karena / Neal）。未批准请说明要改的地方。
4. 只有拿到矩阵要求的**全部明确 approve** 才继续下一份工件或下一阶段。任一签署位缺失、未回复、回复含糊（如「先看看」）一律视为未批准，保持停在当前步骤。
5. 评审结论为 `Fail` 时不得「带病前进」：先按报告的建议修好并重评，直到结论至少为 `Partial`，再请求签署。
6. 签署记录统一写在对应评审报告的「签署记录」小节，逐条用「对象 + 签署位」区分：`proposal` / `spec` 共 3 条（工件 1 + 报告 2），`design` / `tasks` 共 4 条（工件 2 + 报告 2）。每条写明「对象 / 签署位 / 批准人 / 批准时间 / 批准来源 / 批准范围」，不改写评审结论，也不改写他人已签的记录。当前开发者姓名按 `@rule:documentation/rules.md#记录人与签署人` 先问后填。

### 边界

- `all-specs-review` 只出评审意见，不批 Gate、不改规格与代码；它给出的 `Pass` 不等于 `G1/G2/G3` 通过。
- 本规则约束的是**工件与阶段的推进**，不替代 `tdd-cycle`（实现内循环）与 `code-review-checklist`（代码评审）。
- 只改错字、链接或格式且不改变语义的修订，可复用上一份 `Pass` 报告，在报告里追加「变更摘要」一行说明。

### 检查项

| 检查 | 阻断点 |
|---|---|
| `proposal.md` / Delta Spec / `design.md` / `tasks.md` 是否各有对应的 `docs/reviews/<yyyymmdd>-<change-id>-<artifact>-review.md` | pr-merge |
| 报告文件名是否符合 `日期-change-id-artifact-review.md` 格式 | pr-merge |
| `proposal.md` / Delta Spec 是否有 WAYNE 的签署记录（批准人 + 时间） | pr-merge |
| `design.md` / `tasks.md` 是否有 2 个签署位，且第二签署人不是当前开发者、也不是 WAYNE | pr-merge |
| 每份 `docs/reviews/` 评审报告是否同时有 WAYNE 与当前开发者的签署记录 | pr-merge |
| 结论为 `Fail` 的工件是否已修复并重评后才继续 | pr-merge |

### 示例

```text
推荐：写完 tasks.md → 调 all-specs-review → 写 docs/reviews/20261116-add-user-auth-tasks-review.md
     → 停下问「tasks 需要当前开发者 + 1 名非 WAYNE 成员签署，报告由 WAYNE + 当前开发者签署，请给签署人」
     → 拿到 4 条签署记录（工件 2 + 报告 2）再写代码
不推荐：proposal / spec / design / tasks 一次性全生成，最后才问一句「可以吗」
不推荐：design / tasks 只让当前开发者自签，或让 WAYNE 顶替第二签署人
不推荐：评审报告写 docs/ai4se-plugins/ 下，或签署位没签齐就开工
```

### 例外

- 紧急线上故障修复（hotfix）可先实现后补评审，但必须在同一个 PR 内补齐四份报告与矩阵要求的所有签署记录。
- 纯 `docs/**` 文档修订不产生工件，不触发本规则。

## tdd-cycle

**Red / Green / Refactor 循环。** 一次只推进一个业务场景；先确认测试因预期业务原因失败，再写最小实现；只在全绿时重构；代码、测试、注释与提交记录使用同一套业务术语；优先保证可读，不以减少行数为目标。

Red / Green / Refactor 是工作纪律，不是提交节点。提交边界见 `git-commit-conventions`。

### Red：先写失败测试

- 一次只新增一个业务场景，测试代码必须可编译。
- 必须运行并亲眼看到失败；失败原因必须是业务未实现或结果不符，语法错误、空指针、测试数据错误、环境错误都不算有效 Red。
- 失败输出留存，作为 verify 报告里的 Red 证据。

### Green：最小实现

- 不实现未被测试驱动的规则，不做大范围重命名或结构调整。
- 当前测试通过后跑完整测试集，确认没有回归。

### Refactor：全绿状态下重构

- 只做不改变行为的结构调整：提取方法、魔法数字提为命名常量、嵌套三元改提前返回、消除重复的测试准备代码、改善命名、删除无意义注释与调试输出。
- 前后都跑完整测试集，不新增业务行为。

### 完整循环

```text
Red      → 写失败测试并记录失败输出      （不提交）
Green    → 最小实现 + 全量回归           （不提交）
Refactor → 全绿状态整理结构 + 全量测试    （不提交）
Verify   → /opsx verify 通过后提交一次
Archive  → /opsx archive 之后提交一次
```

同一 change 内可跑多轮 Red / Green / Refactor，但仍只对应 verify 与 archive 两次提交。

### 检查项

| 检查 | 阻断点 |
|---|---|
| Red 是否因预期业务原因失败，原因与输出是否记入 verify 报告 | pr-merge |
| Green 是否只含使当前测试通过的最小实现 | pr-merge |
| Refactor 是否未改变业务行为，前后完整测试集是否通过 | pr-merge |
| verify 通过前是否没有提交任何中间态 | pr-merge |

### 例外

- 纯文档、构建脚本、IDE 配置等无业务行为的改动不受本规则约束。
- 紧急缺陷修复仍需先复现失败测试；确实无法先行时，须在提交说明中记录原因与补测计划。

## git-commit-conventions

**提交时机（spec 级）、commit message 与提交前检查。**

### 一个 spec 两次提交（CRITICAL）

以 OpenSpec change（下称 spec）为提交单元，一个 spec 只产生两次提交：

1. **verify 提交** — `/opsx verify`（`openspec-verify-change`）通过后，一次性提交该 change 的完整内容：delta spec、设计、任务、生产代码、测试与验证证据。
2. **archive 提交** — `/opsx archive`（`openspec-archive-change`）之后，提交归档结果、living spec 合并，以及随之更新的知识库（`docs/knowledge/**`）。

除此之外不产生提交：Red / Green / Refactor 不是提交节点；verify 前禁止提交；多个 spec 禁止合并到一次提交；verify 与 archive 两次提交禁止合并。协作或备份需要中间状态时只能用本地临时提交，并在 verify 提交前 squash，不得进入主干历史。

### Commit message

```text
<type>(<stage>): <change-id> <description>
```

- **message MUST 全英文（强制）。** 主题、正文、`<type>`、`<stage>`、`<change-id>`、`<description>` 都用英文，不得出现任何中文字符；城市、产品、模块等中文专名写成英文原词或拼音，不与汉字混写。此约束与格式约束同级，违反即不得提交，也不得用「先提交后改」绕过。
- `stage` 只有两个：`verify`（规格 + 代码 + 测试 + 验证证据）、`archive`（归档目录、living spec、知识库）。
- `type`：`test` / `feat` / `fix` / `refactor` / `docs` / `style` / `chore`。
- `<change-id>` 与 `openspec/changes/` 目录名、分支名一致，从提交能回溯到 spec。
- 描述用简洁动作（`add`、`support`、`extract`、`prevent`、`archive`）并写出关键业务结果；不以句号结尾；禁止 `update code`、`change test`、`fix issue`、`work in progress`。
- 排除 IDE 文件、编译产物与无关格式化修改。

```text
feat(verify): quote-shipping-rule free shipping for member goods of 80
chore(archive): quote-shipping-rule archive change and merge delta into living spec
```

### 提交前检查

- verify 提交前：`/opsx verify` 报告齐全（实现与 change artifacts 一致），完整测试集通过。
- archive 提交前：归档完成，living spec 与知识库索引/日志已同步，完整测试集通过。
- 测试命令按仓库 wrapper 执行（`@rule:java-testing`、`@rule:web-testing`）；多栈变更以最长的验证链为准，不因「另一端没改」跳过。
- 本地或 agent 钩子（宿主 agent 的 PostToolUse 设置）只做两类事：编辑后格式化（如 google-java-format）、`mvnw.cmd compile` 之类的编译检查。本仓库未引入 Checkstyle / ESLint / Prettier，不为单个提交引入新工具链；仓库已引入的检查则必须运行。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 每个 spec 是否恰好两次提交（verify / archive） | pr-merge |
| verify 前是否已通过 `/opsx verify` 且完整测试集通过 | pr-merge |
| archive 提交是否只含归档产物、living spec 与知识库更新 | pr-merge |
| message 是否为 `<type>(<stage>): <change-id> <description>` | pr-merge |
| message 是否全英文（主题与正文均无中文字符） | pr-merge |
| 是否混入 WIP 中间提交、多个 spec 或无关修改 | pr-merge |
| 改动 Java 源码后是否仍可编译，已启用的格式化/静态检查是否运行 | pr-merge |

### 示例

```text
推荐 — 一个 change 两次提交
feat(verify): quote-shipping-rule free shipping for member goods of 80
chore(archive): quote-shipping-rule archive change and merge delta into living spec

不推荐 — 按 TDD 步骤提交中间态
test(red): add free shipping case for member with price 100
feat(green): support free shipping for member goods of 80

不推荐 — 时机或原子性错误
feat: quote-shipping-rule done before verify
feat(verify): quote-shipping-rule + promotion-rule

不推荐 — message 不是英文
fix(verify): add-trip-weather 天气上游不可用时切换备用预报主机
feat(verify): add-trip-weather 支持降级
```

### 例外

- 非 spec 驱动的改动（勘误文档、CI 配置、依赖升级、工具脚本）可单次提交，用 `<type>: <description>`，省略 stage 与 change-id。
- 紧急缺陷修复可先提交 `fix: …` 止血，但须在同一迭代补对应 change，并在说明中记录补单计划。
- 仓库未引入的检查工具不因本规则而引入；要引入须先在提案里说明并整体落地。

## git-branching-and-pr

**分支、PR、换行符与回滚。** 提交时机与 message 见 `git-commit-conventions`，此处不另立一套。

### 分支

| 分支 | 用途 | 命名 |
|---|---|---|
| `main` | 可运行的主线 | 固定名称 |
| 功能 | 一个 change 一条分支 | `feature/<change-id>` |
| 修复 | 一个缺陷一条分支 | `fix/<change-id>` |
| 检查点 | 按练习要求从指定起点重启 | `checkpoint/<序号>-<主题>` |

- `change-id` 与规格里的变更 ID 一致，kebab-case、动词开头：`add-voucher-deduction`。
- 一条分支只服务一个变更，顺手改的无关内容另开分支。
- 不从别人的功能分支拉新分支；需要依赖时先合入 `main`。
- 不直接提交 `main`（检查点分支例外，由当次说明决定）。

### PR

标题沿用 commit 风格并前置 change-id：

```text
[add-voucher-deduction] feat: deduct voucher from promoted price
```

描述五项缺一项不予评审：Spec ID（change-id 与 Delta Spec 位置）、落点（backend / frontend / contract / docs 各改了什么）、验证（命令与结果摘要，不写「已测试」）、契约影响（改了贴 diff，没改写「无」）、界面截图（涉及界面时附上）。一个 PR 对应一个 change；跨 change 拆成多个 PR。不合并自己没跑过验证的代码；G2 验证通过后才合入，验证结果必须是当前提交跑出来的。P5 归档时把 PR 链接写进变更摘要。

### 换行符与编码

- 文本文件统一 LF，仓库根 `.gitattributes`：`* text=auto eol=lf`。
- 例外只有 Windows 脚本：`*.cmd text eol=crlf`、`*.bat text eol=crlf`；已有的 `*.cmd whitespace=cr-at-eol` 保留，再补 eol 规则。
- 文件编码统一 UTF-8，不提交 BOM；不让 `core.autocrlf` 把已提交的 LF 改成 CRLF。

`core.autocrlf=true` 把检出文件转成 CRLF、生成脚本又写回 LF 时，「重新生成结果与仓库内容一致」的校验会莫名失败——这条规则是功能性的，不是洁癖。

### 不提交的内容

```text
target/  node_modules/  dist/  .metals/  *.mv.db  *.trace.db  .idea/  *.iml  e2e/test-results/  e2e/results.json  .DS_Store
```

新增工具产生缓存目录时，先加 `.gitignore` 再继续。

### 回滚

- 合并后发现问题用 `git revert` 生成反向提交，不改写已推送历史。
- 不对 `main` 做 force push，不删除别人的分支，不用 `reset --hard` 处理共享分支。
- 回滚也走 PR，描述里写清回滚原因与受影响的变更。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 分支名是否为 `feature` / `fix` / `checkpoint` 前缀 + change-id，是否只服务一个 change | pr-merge |
| PR 描述是否含 Spec ID、落点、验证、契约影响、界面截图五项 | pr-merge |
| PR 标题是否为 `[<change-id>] <type>: <description>` | pr-merge |
| 一个 PR 是否对应一个 change，验证结果是否来自当前提交 | pr-merge |
| 文本文件是否 LF、无 BOM，`.gitattributes` 是否覆盖 `.cmd` / `.bat` 例外 | pr-merge |
| 是否混入 `target/`、`node_modules/`、`dist/`、IDE 配置与测试产物 | pr-merge |
| 回滚是否用 `git revert` 并走 PR | pr-merge |

### 示例

```text
推荐  branch: feature/add-voucher-deduction
推荐  PR:     [add-voucher-deduction] feat: deduct voucher from promoted price
不推荐 branch: dev / test2 / zhangsan
不推荐 PR 描述: "改了一些东西，测试过了"
```

### 例外

- 单人练习仓库可省略 PR 流程，但仍需在变更摘要里写明验证命令与结果。
- 仓库已有等价 `.gitattributes` 时不重复改写。

## code-review-checklist

**评审方式与规则入口。** 评审只判断三件事：是否符合规格、是否违反规则、是否留下隐患；风格偏好不构成阻断理由。本规则不新增规范，冲突时以来源规则为准。

### 评审怎么做

1. 按变更范围打开受影响规则的「检查项」表逐条对照，不凭记忆评审。
2. 架构：`api-contract`、`package-structure`、`no-circular-dependency`、`orchestration-execution-separation`、`java-patterns`。
3. 质量：`coding-style`、`java-coding-style`、`naming-conventions`、`web-coding-style`。
4. 测试：`java-testing`、`web-testing`；安全：`security-baseline`、`no-hardcoded-secrets`、`pii-scrubbing`、`prompt-injection-defense`、`java-security`。
5. 流程与文档：`spec-first`、`artifact-review-gate`、`tdd-cycle`、`git-commit-conventions`、`git-branching-and-pr`、`document-conventions`、`sdd-artifacts`。

- 本次变更涉及不到的分段（如纯后端变更的前端项）标记为「不适用」，并在评审记录写明，不勾选也不阻断。
- 意见必须包含规则锚点、具体位置与可执行改法。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 是否对照受影响规则的检查项逐条判定 | pr-merge |
| 不适用分段是否显式记录 | pr-merge |
| 每条意见是否带规则锚点与具体改法 | pr-merge |

### 示例

```text
有效：in_member_price100_out_freeShipping 未注明字段，
     应为 in_member_originalPrice100_out_noPromotion_freeShipping
     （rules/testing/rules.md#java-testing）
无效：命名不够清晰，改一下
```

### 例外

- `docs` / `chore` / `style` 类提交只应用与改动范围相关的条目。

## 为什么这样定

以 spec 为提交单元，让主干历史里每个提交都对应一个「已验证、可评审、可整体回滚」的业务变更，而不是实现过程中的中间态。代价是 Red / Green / Refactor 的思考过程不再留在 Git 历史里，因此 Red 证据必须记录在 verify 报告中，由报告承担过程可追溯性。分支与 PR 是 change 的外层容器：边界清楚，评审才能只针对一个变更判断。

规则按主题只写一次、其余位置用锚点引用，是为了让同一条约束不会出现两个版本的措辞——重复的规范在修改时最容易分叉，而分叉后评审就失去唯一判据。

commit message 强制英文，是为了让提交历史在 `git log`、CI 日志、PR 与评审工具里保持同一套可检索的关键词，与 `<type>(<stage>): <change-id> <description>` 这种英文骨架一致；需求与文档仍用中文，两者不混写。