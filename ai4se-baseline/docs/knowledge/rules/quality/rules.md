# 质量规则（quality）

本文件是该分类的权威正文。规则 ID 即二级标题，`@rule:<id>` 与索引中的 `#<id>` 都指向本文件里的同名小节。

## 适用范围

编码风格分三层：`coding-style` 语言无关，`java-coding-style` / `web-coding-style` 按技术栈收紧，`naming-conventions` 管跨端命名、术语与金额字段语义。上层不覆盖下层的硬约束，只在其未覆盖处补充。

本文件不重复其它分类的内容：包与分层见 `@rule:package-structure`，持久化见 `@rule:java-patterns`，测试写法见 `@rule:java-testing` / `@rule:web-testing`，契约字段见 `@rule:api-contract`。

## 规则总表

| ID | 规则 | 优先级 | 触发 | 适用栈 |
|---|---|---|---|---|
| coding-style | 语言无关编码风格 | Critical | always | — |
| java-coding-style | Java 编码风格 | High | auto | java |
| naming-conventions | 跨端命名、术语与金额字段唯一性 | High | always | — |
| web-coding-style | 前端 Web 编码风格 | High | auto | react,typescript |

## coding-style

**语言无关的编码风格底线。**

### 不可变优先（CRITICAL）

始终创建新对象，不修改已有对象：`update(original, field, value)` 返回新副本，而不是原地修改。不可变数据消除隐藏副作用，让调试与并发变简单。

### 三条核心原则

- **KISS**：选能用的最简单方案，避免过早优化，清晰优先于技巧。
- **DRY**：重复逻辑提取成共享函数；重复是真实存在的才抽象，不预防性抽象。
- **YAGNI**：不为想象中的需求提前建抽象；压力真实出现时再重构。

### 文件组织

小文件优于大文件：高内聚、低耦合，常规 200–400 行、上限 800 行，按特性或领域组织而不是按类型。

### 边界校验与错误处理

- 用户输入、外部接口响应、文件内容一律视为不可信，在系统边界校验；优先用 schema，失败要快速且信息明确。
- 每一层显式处理错误，不静默吞掉异常；面向用户的代码给可读提示，服务端日志保留详细上下文。

### 需要避免的坏味道

嵌套过深（尽早 `return`）、魔法数字（提取命名常量）、超长函数（按职责拆分）。标识符命名不在此处规定，见 `@rule:naming-conventions`。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 是否有原地修改；是否使用不可变更新 | pr-merge |
| 函数是否聚焦（一般少于 50 行），文件是否少于 800 行 | pr-merge |
| 嵌套是否不超过 4 层，是否有魔法数字 | pr-merge |
| 错误是否显式处理，边界输入是否校验 | pr-merge |

### 例外

- 技术栈规则可以收紧这些默认值，但不能静默放宽。

## java-coding-style

**Java 编码风格。** 适用于 Java 21 + Maven Wrapper 项目：Windows 用 `mvnw.cmd`，其他平台用 `./mvnw`，不手工 `mvn`。包结构、类名后缀与测试放置分别见 `@rule:package-structure` 与 `@rule:java-testing`。

### 命名

| 对象 | 规则 | 示例 |
|---|---|---|
| 类、接口、Record | UpperCamel | `QuoteCalculator` |
| 方法、变量 | lowerCamel | `calculate`、`memberPrice` |
| 布尔值 | 表达明确状态 | `member`、`eligibleForFreeShipping` |
| 常量 | UPPER_SNAKE | `SHIPPING_FEE`、`FREE_SHIPPING_THRESHOLD` |
| 金额常量后缀 | 阈值 `_THRESHOLD`、固定收费 `_FEE`、减免额 `_OFF`、券面额 `_FACE` | `PROMOTION_OFF`、`VOUCHER_FACE` |
| 配置键 | 小写点分 | `spring.datasource.url` |

```java
// 不推荐
BigDecimal value;      // 没说是哪个金额
BigDecimal result;     // 中间结果不能都叫 result
boolean flag;          // 状态必须写清楚是什么状态

// 推荐
BigDecimal originalPrice;
BigDecimal promotion;
BigDecimal shipping;
boolean member;
```

### 金额处理（CRITICAL）

- 金额统一 `BigDecimal`，禁止 `double` / `float`，禁止用 `int` 表示分以外的金额。
- 金额常量统一用 `Money.amount("...")` 创建，不用 `new BigDecimal(100)`、`BigDecimal.valueOf(100)`，避免 scale 不一致。
- 比较用 `compareTo`，禁止 `equals`（`BigDecimal.equals` 同时比较数值和 scale，`80.0` 与 `80.00` 不相等）。
- 除法与按比例计算必须显式指定 `RoundingMode`，并说明在哪一步舍入。`Money.memberPrice` 用 `HALF_UP` 保留两位，测试需覆盖「只舍入一次」。
- `Money.amount` 使用 `RoundingMode.UNNECESSARY`：超过两位小数的字面量直接抛异常，字面量精度写错应当在测试里立刻暴露，而不是被静默四舍五入。
- 契约是整数分、Java 内部是 `BigDecimal` 元，转换只发生在 Controller 或 DTO 边界（见 `@rule:api-contract`）。

```java
private static final BigDecimal SHIPPING_AMOUNT = Money.amount("10.00");
private static final BigDecimal ZERO_AMOUNT = Money.amount("0.00");

if (goods.compareTo(MEMBER_SHIPPING_THRESHOLD) >= 0) {
    // 达到会员免运费门槛
}
```

### 常量与阈值

- 只在当前类使用的常量写 `private static final`；确认是对外契约、需要被其他类引用时才写 `public static final`。
- 需要被同包测试引用的常量写成包级可见（`static final`，不带修饰符），不要为了测试升成 `public`。
- 阈值必须能在规格里找到出处，常量名与规格术语一致；同一阈值只定义一次，测试引用常量而不是抄数字。
- 阈值基于哪个金额判断必须在方法名或 JavaDoc 里写清（`calculateShipping(goods)` 与 `calculateShipping(originalPrice)` 是两种业务），字段语义见 `@rule:naming-conventions`。

### 空行与布局

- 字段、构造方法、公共方法、私有方法之间保留一个空行；同一逻辑步骤内部不要过多空行。
- 不为了视觉对齐添加不稳定的额外空格；一个方法保持单一职责，出现第二个可命名的业务步骤时提取私有方法。

### 计算顺序必须清晰

`QuoteCalculator` 的流程应能从上到下读出来：

1. 参数校验（负数直接拒绝），零金额等特殊输入早返回。
2. 计算会员价。
3. 根据会员价计算促销减免。
4. 计算促销后的商品金额（`afterPromotion`）。
5. 计算代金券抵扣，得到券后商品金额。
6. 根据券后商品金额和会员身份计算运费。
7. 计算最终总价。

```java
public Quote calculate(BigDecimal original, boolean member) {
    if (original.signum() < 0) {
        throw new IllegalArgumentException("price must not be negative");
    }
    if (original.signum() == 0) {
        BigDecimal zero = Money.amount("0.00");
        return new Quote(original, zero, zero, zero, zero, zero, zero);
    }

    BigDecimal memberPrice = Money.memberPrice(original, member);
    BigDecimal promotion = calculatePromotion(memberPrice);
    BigDecimal afterPromotion = memberPrice.subtract(promotion);
    BigDecimal voucher = calculateVoucher(afterPromotion);
    BigDecimal goods = afterPromotion.subtract(voucher);
    BigDecimal shipping = calculateShipping(goods, member);
    BigDecimal total = goods.add(shipping);

    return new Quote(original, memberPrice, promotion, voucher, goods, shipping, total);
}
```

- 中间变量必须命名（含 `afterPromotion` 这类过渡值），不把整条表达式塞进构造参数。
- 不在计算过程中打印日志或 `System.out`，结果通过返回值暴露。

### 方法命名与条件表达

- 计算型方法用 `calculate<名词>`，查询型用 `find<名词>` / `load<名词>`；同一项目不得混用 `calculate*` 与 `get*`。
- 简单二选一可用三元；三个以上分支用从高到低的提前返回，禁止嵌套三元。

```java
private static BigDecimal calculateShipping(BigDecimal goods, boolean member) {
    BigDecimal threshold = member
            ? MEMBER_SHIPPING_THRESHOLD
            : NON_MEMBER_SHIPPING_THRESHOLD;

    return goods.compareTo(threshold) >= 0 ? ZERO_AMOUNT : SHIPPING_AMOUNT;
}
```

参数名必须体现语义，禁止 `calculateShipping(BigDecimal price, boolean member)`。

### 对象与不可变

- 值对象优先 `record`；字段默认 `final`，只有确实需要变化的状态才可变（原则见 `@rule:coding-style`）。
- 集合字段对外返回时做防御性拷贝（`List.copyOf`、`Map.copyOf`）；不给 record 加 setter 式方法，需要变化时返回新实例。

### 异常与错误表达

- 输入非法抛 `IllegalArgumentException`，消息写英文小写短语且不带句号：`"price must not be negative"`。
- 业务拒绝用专门的异常类型（如 `QuoteRejected`），不用 `RuntimeException` 加字符串判断。
- 不用异常做正常分支控制：零金额、无促销这类可预期情况用返回值表达。
- 状态码映射由统一错误处理器完成，以契约为准，不在 Controller 里散落 `if`（见 `@rule:api-contract`）。

### 注释

注释解释「为什么」：关键业务规则、阈值基于哪个中间金额、特殊边界、无法从代码看出的设计原因。JavaDoc 用在两类地方——公开 API 的参数含义，以及包含多个金额、容易混淆判断依据的方法。禁止保留流水账式编号注释（`// 1. 判断金额是否为 0`）与调试输出。

```java
// 不推荐
// 获取会员价格
BigDecimal memberPrice = Money.memberPrice(original, member);

// 推荐
// 运费门槛基于会员折扣和促销减免后的商品金额判断。
BigDecimal shipping = calculateShipping(goods, member);
```

### 通用 Java 约定

- `Optional<T>` 仅用于可能无结果的查找方法返回值，禁止作为字段类型和方法参数。
- 领域异常继承 `RuntimeException` 且消息包含上下文；避免在非顶层处理处 `catch (Exception e)`。
- 流式操作保持短管道，复杂逻辑优先用循环。
- 构造注入与依赖倒置见 `@rule:java-patterns`。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 金额是否全部 `BigDecimal` 且由 `Money.amount` 构造，比较是否用 `compareTo` | pr-merge |
| 除法与按比例计算是否显式指定 `RoundingMode`，分与元转换是否只在边界 | pr-merge |
| 是否消除魔法数字与嵌套三元，阈值是否使用正确的中间金额字段 | pr-merge |
| 同一阈值是否只定义一次，测试是否引用常量 | pr-merge |
| 命名是否表达业务含义，内部常量是否优先 `private static final`，金额常量后缀是否合规 | pr-merge |
| 输入非法是否抛 `IllegalArgumentException`，业务拒绝是否用专门异常类型 | pr-merge |
| 注释是否解释业务原因，是否残留编号注释和调试代码 | pr-merge |

### 例外

- 若团队改用 `getPromotion` / `getShipping` 命名，须整体统一，不得与 `calculate*` 混用。
- 现有代码与本规则不一致时，在下次因业务变更修改该文件时收口，不单开重构提交。

## naming-conventions

**跨端命名、术语与金额字段唯一性。** 本规则是术语与金额字段语义的权威；Java 标识细则见 `@rule:java-coding-style`，前端标识见 `@rule:web-coding-style`，契约字段格式见 `@rule:api-contract`。

### 跨端命名速查

本表只做索引，细则以对应规则为准。

| 对象 | 规则 | 例子 |
|---|---|---|
| 仓库目录 | 全小写，单词间连字符 | `parcel-quote` |
| 分支 | `feature/` `fix/` `checkpoint/` + change-id | `feature/add-voucher-deduction` |
| change-id | kebab-case，动词开头，与分支共用 | `add-voucher-deduction` |
| 规格目录 | capability 用名词短语，kebab-case | `openspec/specs/quote-pricing/` |
| 文档文件 | `<class>-<group>-<topic>-<yyyymmdd>-v<n>.md` | `class3-group2-backend-java-20261110-v2.md` |
| 测试命令 | 沿用仓库已有脚本，不新造同义脚本 | `mvnw test`、`npm test` |
| 接口字段 | snake_case，前后端都不得转写 | `weight_kg`、`amount_cents` |
| Java 标识 | 类 UpperCamel / 方法变量 lowerCamel / 常量 UPPER_SNAKE | `QuoteCalculator`、`memberPrice` |
| TS 标识 | 组件与类型 UpperCamel / 函数变量 lowerCamel | `QuoteDetailPage`、`loadQuotes` |
| 数据库对象 | 表与列 snake_case | `quotes`、`created_at` |
| CSS 类 | kebab-case，模块前缀 | `.parcel-form` |
| 环境与配置键 | 小写点分 | `spring.datasource.url` |

### 两条必须守住的边界

1. **接口字段的 snake_case 是契约的一部分，前端不做驼峰转换。** `ParcelInput.weight_kg` 在 TS 里仍叫 `weight_kg`；表单状态 `FormValues` 也保持同名，只在值类型上从 `number` 变 `string`，转换只发生在提交前的解析函数里。只有纯界面状态（`isLoading`、`selectedId`）才用驼峰。
2. **同一个概念只有一个词。** 金额字段固定为下表集合，不得出现 `price`、`amount`、`finalPrice`、`netPrice` 等近义词混用。

### 金额字段语义（权威）

| 字段 | 含义 |
|---|---|
| `originalPrice` | 商品原价，`calculate` 的输入金额 |
| `memberPrice` | 会员折扣后的金额 |
| `promotion` | 满减促销减免金额 |
| `voucher` | 代金券抵扣金额 |
| `goods` | 会员折扣、促销、代金券依次扣减后的商品金额 |
| `shipping` | 运费 |
| `total` | 最终支付金额 |

计算顺序即字段顺序，不要随意调换。促销门槛基于 `memberPrice`，运费门槛基于券后的 `goods`；`originalPrice` 只是外部输入，不一定是用于门槛判断的金额。`afterPromotion` 是方法内部的过渡值，不进契约、领域对象与测试名。

### 术语

| 术语 | 含义 | 不用 |
|---|---|---|
| `quote` | 一次报价的计算结果 | quotation、order |
| `voucher` | 代金券抵扣 | coupon、discount |
| `promotion` | 满减促销 | discount |
| `change` | 一次规格驱动的变更单元 | task、ticket |
| `change-id` | 变更标识，与分支名一致 | ticket-no |
| `goods` | 折扣、促销、代金券依次扣减后的商品金额 | netPrice、finalPrice |

### 检查项

| 检查 | 阻断点 |
|---|---|
| 接口字段是否保持 snake_case，未被前端转驼峰 | pr-merge |
| 金额字段是否使用固定集合，无近义词轮换 | pr-merge |
| 分支名、change-id、规格目录命名是否符合速查表 | pr-merge |

### 示例

```text
推荐  weight_kg / amount_cents / created_at / originalPrice / goods
不推荐 weightKg / amountCents / createdAt（接口层转驼峰）
不推荐 price / amount / finalPrice / netPrice（金额同义词轮换）
```

### 例外

- 第三方 SDK 强制要求的命名需在 PR 中说明；映射只在边界做一次，不扩散到业务代码。
- 纯界面状态可以有前端本地命名习惯，只要不与接口字段同名混淆。

## web-coding-style

**前端 Web 编码风格。** React 18 或 19（以 `package.json` 为准，不为统一而升级），TypeScript 严格模式，构建走 `tsc --noEmit && vite build`。界面组件以 Ant Design 为第一选择（见下节「组件选型」）。测试框架按仓库现状使用，不引入第二套做同一件事。字段与错误码以 `@rule:api-contract` 为准，跨端命名见 `@rule:naming-conventions`。

### 目录

```text
frontend/
  src/
    api.ts              请求层，唯一出口
    types.ts            契约类型与本地视图类型
    route.ts            应用级路由解析与跳转（纯逻辑，可单测）
    App.tsx             路由与页面骨架
    main.tsx            挂载入口
    styles.css          全局样式与变量
    components/         可复用组件
    <feature>/          业务模块，纯逻辑与状态放这里
    i18n/               文案与语言上下文
    utils/              可选叶子：无业务逻辑的通用工具
e2e/
  tests/                端到端用例
  playwright.config.ts
```

- 业务逻辑不写进组件：状态迁移、校验、格式化、请求参数拼装放 `<feature>/*.ts`，组件只做取值、渲染、绑事件。
- 应用级纯逻辑（如路由解析 `route.ts`）放 `src/` 根；属于某个业务模块的逻辑仍放 `<feature>/*.ts`。
- 一个组件文件只导出一个组件，文件名与组件同名；路由级页面用 `XxxPage.tsx`，可复用片段用名词（`ParcelForm`），纯逻辑模块用小驼峰文件名（`api.ts`）。
- 测试文件与被测模块同目录同名加后缀：`boardState.test.ts`、`ParcelForm.test.tsx`。
- 目录的层语义见 `@rule:package-structure`；依赖版本与构建故障以 [operations/README.md](../../operations/README.md) 的「前端工具链基线」为准。

### 命名

| 对象 | 规则 | 例子 |
|---|---|---|
| 组件文件与组件 | UpperCamel，两者同名 | `ParcelForm.tsx` → `ParcelForm` |
| 页面组件 | `XxxPage` | `QuoteDetailPage` |
| hook | `useXxx`，文件名同 | `useQuotes.ts` |
| Context 与 Provider | `XxxContext` / `XxxProvider` | `LanguageContext` |
| 类型与接口 | UpperCamel，不加 `I` 前缀 | `ParcelInput`、`FieldErrors` |
| 联合类型成员 | 小写字符串字面量 | `'created' \| 'moved'` |
| 常量 | UPPER_SNAKE 或 `as const` 数组 | `LABEL_COLORS` |
| 事件处理函数 | `handleXxx`；props 用 `onXxx` | `handleSubmit` / `onAdd` |
| 请求函数 | 动词加资源名 | `loadQuotes`、`saveQuote`、`reviseQuote`、`deleteQuote` |
| 布尔 UI 状态 | `is` / `has` 前缀 | `isLoading`、`hasError` |
| CSS 类 | kebab-case，模块前缀 | `.parcel-form` |
| 测试文件 | 同名加 `.test.ts(x)`；端到端 `.spec.ts` | `collision.test.ts`、`quotes.spec.ts` |

### 组件写法

- 用命名导出 `export function Component()`，不用默认导出；props 用 `type Props = {...}` 定义在组件上方。
- 子组件不接收整个状态对象，传它需要的字段和回调，避免一次改动引发全树重渲染。
- 组件超过 150 行，或出现第二段可命名的界面区块时，拆子组件或提取 hook。
- 不给组件加 `any`。第三方类型缺失时写最小本地类型，并注释说明来源。
- 条件渲染保持正向表达，避免多层嵌套三元；两个以上分支用提前 `return` 或拆子组件。
- 点击处理器若会同步替换同一表单内的按钮（如向导「下一步」在末步换成「保存」），MUST 在处理器内调用 `event.preventDefault()`：Chromium 会在点击默认动作阶段激活替换后的 submit 按钮，导致误提交（实证：`DemandFormPage` 四步向导）。

### 请求层

所有网络请求走 `src/api.ts`，组件里不直接 `fetch`。

```ts
export async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`/api${path}`, init);
  if (!response.ok) {
    const body: { code?: string } | null = await response.json().catch(() => null);
    throw new Error(body?.code || `HTTP ${response.status}`);
  }
  return response;
}
```

- 路径不带 `/api` 前缀，统一由 `request` 拼上；业务错误抛 `Error(code)`，`code` 用契约错误码原值（如 `INVALID_INPUT`、`SERVICE_UNAVAILABLE`），不翻译成中文再判断。
- 每个资源一组函数：`load`（读列表或详情）、`save`（新建）、`revise`（整体更新）、`delete`。
- 函数返回已解析的业务类型，不返回 `Response`；需要读响应头时再单独设计。
- 写操作先设 pending 状态，完成或失败后复位；`onPendingChange` 这类回调让提交按钮在提交期间不可重复点击。
- 处理过期数据：详情页用路由 id 比对返回结果（`detail?.id === parsedId`）；可能并发读取时用请求序号或 `AbortController` 丢弃过期结果，不靠「最后写入覆盖」。
- 请求参数不做隐式转换：`weight_kg` 从输入框拿到的是字符串，转数字在提交前的解析函数里做，失败返回 `FieldErrors`。

### 类型与状态

- 契约类型集中在 `types.ts`，命名与 `openapi.yaml` 的 schema 对应；列表用摘要类型，详情用完整类型。
- 本地派生类型单独命名并注明用途：`FormValues`（表单字符串值）、`FieldErrors`（字段级错误）、`LocalDraft`（未保存草稿）。
- 用可辨识联合表达状态机，不用一堆布尔：

```ts
type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; quotes: QuoteSummary[] }
  | { status: 'failed'; code: string };
```

- 本地存储带 schema 版本号（如 `BoardState.schemaVersion`）；结构变化时升版本并写迁移，读到未知版本按空状态处理，不让页面白屏。

### 样式

- 全局样式放 `src/styles.css`，颜色、间距、字号用 `:root` 变量，组件里不写十六进制色值；令牌取值以 [architecture/README.md](../../architecture/README.md) 的对照表为准。
- 类名 kebab-case 带模块前缀，子元素用后代选择器（`.parcel-list li`）；状态类统一 `is-` 前缀（`.is-loading`）。
- 内联 `style` 只用于运行时计算值（进度条宽度、拖拽位移），静态样式一律进 CSS。
- 组件库固定为 Ant Design（`antd`，版本以 `frontend/package.json` 为准），界面控件按下一节「组件选型」先查 antd，不引入第二套 UI 组件库或 CSS 框架。

### 组件选型（Ant Design 优先）

**界面组件 MUST 优先使用 Ant Design；只有 antd 没有对应组件、或存在阻断性缺陷时，才允许改用原生控件或其它实现，并在当次 change 的 P3 设计记录里写明原因与替代方案。**

| 场景 | 首选（antd） | 禁止 / 避免 |
|---|---|---|
| 日期、日期区间、月份 | `DatePicker` / `DatePicker.RangePicker` | `<input type="date">`、手写日历 |
| 排序、枚举下拉 | `Select`；选项不超过 3 个且需并排对比时用 `Segmented` | `<select>`、自绘下拉 |
| 数字、人数、金额输入 | `InputNumber` | `<input type="number">` 配字符串状态 |
| 单选 / 多选 | `Radio.Group` / `Checkbox.Group` | 自绘按钮组冒充选择器 |
| 可切换标签 | `Tag.CheckableTag`；只读标签用 `Tag` | 自绘 `.chip` 按钮 |
| 进度、占比、匹配度 | `Progress`（线形 / 圆形） | 手写 `<svg>` 圆环、`div` 进度条 |
| 提示、空态、加载 | `Alert` / `Empty` / `Skeleton` / `Spin` | 自绘提示块 |
| 弹窗、抽屉 | `Modal` / `Drawer` | 手写遮罩层 |
| 分页 | `Pagination` | 自绘页码 |

- 日期值在表单状态里仍保存 `YYYY-MM-DD` 字符串，只在组件边界用 `dayjs` 转换；不把 `Dayjs` 对象塞进契约类型或纯函数。
- 日期弹层 MUST 走 `utils/datePickerProps.ts`（挂到字段容器 + `app-date-popup`），并在 `@media (prefers-reduced-motion: reduce)` 下固定到字段下方。antd 6.7 默认会把弹层留在视口外，用户看到的是「点击日期没有反应」。
- 通过 `ConfigProvider` + `theme.ts` 统一主题；不为单个页面覆盖 antd 组件内部样式。布局间距可以写页面 CSS，控件外观交给 antd。
- 已记录的例外（2026-11-16）：
  - `ProfileSetupPage` 的「职业」「MBTI」保留原生 `<select>`：antd 6.7 在系统开启「减少动态效果」（`prefers-reduced-motion: reduce`）时把弹层渲染到视口外，选项无法点选。修复该缺陷或升级到已修复版本后 MUST 改回 `Select`。
  - 地图选点 `PlacePicker` / `PlaceMap`：antd 没有地图选点组件，沿用现有 SVG 地图实现。
- 新增例外 MUST 追加到本清单，并在对应 change 的 P3 设计里引用；不得只在代码注释里说明。

### 可访问性

- 表单控件必须有可关联标签：`<label htmlFor>` 配 `id`，端到端测试能用 `getByLabel` 找到。
- 可点击的东西用 `<button>` 或 `<a>`，不给 `div` 绑 `onClick`；图标按钮补 `aria-label`，纯装饰图标加 `aria-hidden`。
- 状态变化用文本表达（`1300 cents`、`Saved`），不只靠颜色；新增交互要键盘可达（Tab 能到，Enter 或 Space 能触发）。

### 文案与国际化

- 界面文案集中在 `i18n/messages.ts`，组件里不写死句子；key 用小驼峰，按区块分组，占位符用 `{count}`、`{title}`。
- 不拼接句子片段，语言顺序不同时必然出错，改为整句模板；页面标题、按钮、错误提示用词一致。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 组件文件名与组件同名、使用命名导出 | pr-merge |
| 业务逻辑不在组件内，纯函数有对应测试 | pr-merge |
| 接口字段保持 snake_case，未转驼峰 | pr-merge |
| 请求只走 `api.ts`，错误码用契约原值，过期响应有处理 | pr-merge |
| 表单控件有 label，可点击元素是 button 或 a | pr-merge |
| 日期/排序/数字/标签/进度是否使用 antd 对应组件；例外是否按「组件选型」记录 | pr-merge |
| 同步替换 submit 按钮的步骤处理器是否带 `event.preventDefault()` | pr-merge |
| 文案在 `messages.ts`，无拼接句；样式用 `:root` 变量 | pr-merge |

### 示例

```tsx
// 推荐
export function ParcelForm({ onSubmit }: Props) { /* ... */ }

// 不推荐 — 默认导出 + any
export default function Form(props: any) { /* ... */ }
```

```ts
// 推荐 — 业务错误用契约错误码
throw new Error(body?.code || `HTTP ${response.status}`);

// 不推荐 — 中文提示当判断依据
if (message.includes('不可用')) { /* ... */ }
```

### 例外

- 已有历史组件若使用默认导出，在下次因业务变更修改该文件时统一为命名导出，不单开重构提交。
- 仓库已有测试框架不一致时按仓库现状执行，不引入第二套；新增仓库可任选其一并在 README 记录。

## 为什么这样定

统一的风格约定让团队与 agent 产出的代码在命名、金额精度、常量可见性和业务表达上保持一致。金额用 `BigDecimal` 与 `compareTo` 是为了避开浮点误差与 scale 比较陷阱，显式 `RoundingMode` 让舍入发生的位置成为可评审的决定。前端的问题多来自「业务逻辑长在组件里」与「接口字段在边界被改名」：把纯逻辑下沉、请求收敛到 `api.ts`、契约字段原样透传，组件才能保持薄。

金额字段语义与术语只写在 `naming-conventions` 一处，是因为这些词会在契约、后端、前端和测试里同时出现；同一个词存在两个版本的定义时，代码与测试会各自漂移而不易察觉。