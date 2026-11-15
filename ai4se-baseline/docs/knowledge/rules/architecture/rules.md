# 架构规则（architecture）

本文件是该分类的权威正文。规则 ID 即二级标题，`@rule:<id>` 与索引中的 `#<id>` 都指向本文件里的同名小节。

## 适用范围

模块划分、依赖方向、接口契约与持久化设计。与语言无关的约束写在前面几条；`java-patterns` 只对 Java 项目生效。分层目录的权威在本文件，`docs/knowledge/architecture/README.md` 只做指针与运行时拓扑。

## 规则总表

| ID | 规则 | 优先级 | 触发 | 适用栈 |
|---|---|---|---|---|
| api-contract | 接口契约先行 | Critical | always | — |
| package-structure | 应用分层、包/目录分类与依赖方向 | Critical | auto | java,react,typescript |
| no-circular-dependency | 禁止模块循环依赖 | Critical | auto | — |
| orchestration-execution-separation | 编排层不承载业务判断 | Critical | auto | — |
| java-patterns | Java 模式与持久化约定 | High | auto | java |

## api-contract

**接口契约先行。** 契约文件是仓库根的 `openapi.yaml`（OpenAPI 3.0.3），是前后端唯一事实源：字段名、类型、必填、状态码、错误码一处定稿，两端照做。

### 改动顺序

1. 改 `openapi.yaml`：路径、schema、状态码、示例。
2. 改后端：DTO 与 Controller 对齐契约，补接口测试。
3. 改前端：`types.ts` 与 `api.ts` 对齐，补对应测试。
4. 跑两端验证，PR 里贴契约 diff。

顺序不能颠倒：先写后端或先写前端类型，都会出现「代码比契约走得快」的时间窗，期间的联调结论不可信。

### 路径

| 规则 | 例子 |
|---|---|
| 资源用复数名词 | `/quotes` |
| 层级用斜杠，不用下划线或驼峰 | `/quotes/{id}/items` |
| 路径参数用单数名词，花括号包裹 | `/quotes/{id}` |
| 仅当 CRUD 无法表达动作时才用动词子路径 | `/quotes/{id}/submit` |
| 不把动作写进资源名 | 禁止 `/getQuote` |
| 版本放 `info.version`，不写进路径 | 不用 `/v1/quotes` |

### 字段

| 类别 | 规则 | 例子 |
|---|---|---|
| 一般字段 | snake_case | `weight_kg`、`updated_at` |
| 金额 | 整数分，字段名以 `_cents` 结尾 | `amount_cents: 1300` |
| 时间 | RFC3339 UTC，字段名以 `_at` 结尾 | `created_at` |
| 标识 | `id`，`integer` + `format: int64` | `id: 1` |
| 枚举 | 小写字符串 | `zone: local \| remote` |
| 布尔 | `is_` / `has_` 前缀 | `is_express` |
| 数量与重量 | 带单位后缀 | `weight_kg`，不用 `weight` |

- 金额一律整数分，不用浮点数或字符串；后端 `BigDecimal` 元只在 Controller 边界转换一次。
- 时间只输出 UTC；前端展示时再按本地时区格式化。
- 字段可空时用 `nullable: true` 并在 `description` 说明「何时为空」。
- 不返回内部实现字段（数据库列名、实体字段、内部状态机值）。

### Schema

- 每个 schema 写 `required`；服务端生成字段标 `readOnly: true`（`id`、`amount_cents`、`created_at`、`updated_at`）。
- 请求与响应复用同一组 schema，用 `allOf` 组合输入与只读字段，避免两份字段列表各自演化。
- 每个有请求体的接口给至少两个 `examples`：一个成功、一个典型拒绝。
- 字段语义写进 `description`，数值范围写进 schema（`minimum` / `maximum`）；只写在注释里等于没有约束。

### 状态码与错误

| 场景 | 状态码 | 响应体 |
|---|---|---|
| 新建成功 | 201 | 完整资源 |
| 读取成功 | 200 | 资源或资源数组 |
| 删除成功 | 204 | 无响应体 |
| 字段缺失或类型错误 | 400 | `Error` |
| 资源不存在 | 404 | 空响应体或 `Error`，同一资源保持一致 |
| 业务规则拒绝 | 422 | `Error`，且不改变已存数据 |
| 未预期异常 | 500 | `Error`，不返回堆栈 |

- `code` 用大写下划线常量，前端按原值判断，不做字符串包含匹配。
- 400 与 422 的边界：格式不对是 400，格式对但业务不接受是 422；同一输入不允许时而 400 时而 422。
- 新增错误码同时改三处：契约枚举、后端映射、前端提示文案。
- 错误响应只对外给 `code`，内部异常消息进日志。

### 版本与兼容

- `info.version` 用语义化版本：向后兼容的新增升次版本；删除字段、改类型、改语义升主版本。
- 新增字段一律可选并给默认值说明，老前端不传也能工作。
- 删除或重命名字段：先标 `deprecated: true` 并写替代字段，两端改完后下一个主版本再删。
- 不改变既有字段单位：`amount_cents` 一旦是分，永远不能改成元。
- 列表接口加分页属于破坏性变更，按主版本处理，不偷偷把数组换成对象。

### 前后端同步

- `frontend/src/types.ts` 与 schema 一一对应、命名完全相同；不一致时以 `openapi.yaml` 为准。
- 本轮不引入代码生成；手写类型在 PR 里附「类型 ↔ schema」对照说明。
- 后端 `OpenApiTest` 至少验证：文件可解析、关键路径存在、必填字段在 `required` 里；它不能替代接口行为测试。
- 契约改动后两端测试都要跑，只跑一端不算验证完成。
- 契约变更属于规格变更：新增写 ADDED、改语义写 MODIFIED、删除写 REMOVED，验收场景给出请求与响应样例（阶段门槛见 `@rule:spec-first`）。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 是否先改 `openapi.yaml` 再改两端 | pr-merge |
| 路径用复数资源，无动词资源名；版本不写进路径 | pr-merge |
| 字段 snake_case、金额 `_cents`、时间 `_at` + UTC | pr-merge |
| 必填字段在 `required`，服务端生成字段 `readOnly`，请求体有成功与拒绝两个 example | pr-merge |
| 400 与 422 边界未漂移；错误体只有 `code` | pr-merge |
| 新增错误码三处同步；前端类型与 schema 字段名一致 | pr-merge |
| 破坏性变更已升主版本或标 `deprecated`；两端测试均通过 | pr-merge |

### 示例

```yaml
# 推荐
Quote:
  allOf:
    - $ref: '#/components/schemas/ParcelInput'
    - type: object
      required: [id, amount_cents, created_at, updated_at]
      properties:
        id: {type: integer, format: int64, readOnly: true}
        amount_cents: {type: integer, readOnly: true}
        created_at: {type: string, format: date-time, readOnly: true, description: 创建时间，UTC}

# 不推荐 — 金额用浮点数、字段驼峰、无 required
Quote:
  properties:
    totalPrice: {type: number}
```

### 例外

- 纯内部接口（不经前端）可不写示例，但仍需 `required` 与错误体约定。
- 只有只读接口、无请求体时，可省略两个 example 的要求并在 PR 中说明。

## package-structure

**依赖必须遵守本规则声明的分层方向。** 上层可调用下层，反向调用禁止；本标准同时规定层语义、包/目录分类与类名后缀。

- 依赖方向以本文件的「依赖方向」为准，不以个人习惯为准；跨层捷径必须有 ADR 或例外记录，没有记录就是违规。
- 新模块合并前先把自己的层写进架构知识文档，否则评审无法判断依赖是否合法。
- 触发分层即按本标准分类组织，不再等待额外阈值：新建 Web 型项目（Spring Boot）即分层；非 Web 小项目可按特性平铺，单个包超过 15 个类或出现两个以上业务域时改按层。
- 根包按产品命名（RouteME 为 `routeme`；旧作业的 `staffing` 是历史领域名），Web 型项目全局按层，层包直接位于根包下，不建业务域目录层；业务归属由类名与职责表达。
- 同一项目不得一半平铺一半分层；整体搬移在单个 PR 内完成并说明。

### 分层模型

| 层 | Java 包 | 前端对应 | 职责 |
|---|---|---|---|
| 开放接口 / Web 层 | controller | `api.ts` 请求出口 | 路由、参数校验、转换、错误码映射；无业务判断 |
| 入参封装 | param | — | 控制器入参解析与聚合（`XxxParam`），不含业务判断 |
| 终端显示层 | ui（可选） | `components/` + `XxxPage` | 渲染与交互，无业务逻辑 |
| Service 层 | service | `<feature>/*.ts` 纯逻辑 | 业务规则与编排；拥有数据表的接口继承 `IService<XxxEntity>` |
| Service 实现 | service/impl | — | 继承 `ServiceImpl<XxxMapper, XxxEntity>` 实现接口，事务边界与业务规则落在这里 |
| Manager 层 | manager（可选） | `<feature>` 内通用逻辑 / hooks | 第三方封装、通用能力下沉、多服务组合复用 |
| ORM 映射 | mapper | — | MyBatis-Plus 映射接口（`XxxMapper extends BaseMapper`，标 `@Mapper`） |
| 实体 | entity | — | 表结构映射（`XxxEntity`，带 `@TableName`），只被 mapper 与 `service/impl` 引用 |
| 领域对象 | pojo | `types.ts` | 业务语义 record（`TripPlan`、`TripMatch` 等）与分页结果；无持久化注解 |
| SQL 片段 | sql | — | 复用的 SQL 片段与构建器（MyBatis XML 统一放 `resources/mapper/`） |
| 入参传输 | request | `types.ts` | 请求体与查询参数 record（`XxxRequest` / `XxxQuery`） |
| 出参传输 | response | `types.ts` | 响应体 record（`XxxResponse` / `XxxResult`）与 `ErrorResponse` |
| 视图输出 | vo（按需） | — | 与领域形状不同的接口视图对象 |
| 静态字典 | constant | — | 阈值与静态字典（`XxxConstant`） |
| 业务枚举 | enums | — | 业务枚举（`XxxEnum`） |
| 异常 | exception | — | 业务异常基类 `BusinessException` 与子类（`XxxException`） |
| 异常处理器 | handler | — | 全局异常处理器 `GlobalExceptionHandler` |
| 横切 | aspect / interceptor | — | AOP 切面与 MVC 拦截器 |
| 自定义注解 | annotation | — | 自定义注解定义 |
| 消息队列 | mq | — | 生产者与消费者 |
| 配置装配 | config | — | Spring 配置类、Bean 与 Web 组件装配 |
| 通用工具 | utils | `utils/` | 无状态工具，叶子包 |

### 标准包分类（Java）

```text
<root-package>/
├── Application.java   启动类
├── annotation/        自定义注解
├── aspect/            AOP 切面
├── config/            Spring 配置与组件装配
├── constant/          静态字典与阈值（XxxConstant）
├── controller/        Web 层（XxxController）
├── enums/             业务枚举（XxxEnum）
├── exception/         业务异常基类与子类（XxxException）
├── handler/           全局异常处理器（GlobalExceptionHandler）
├── interceptor/       MVC 拦截器
├── mapper/            MyBatis-Plus 映射（XxxMapper，全部标 @Mapper）
├── entity/            表结构映射实体（XxxEntity，@TableName）
├── pojo/              领域对象 record（业务语义，无持久化注解）与分页结果
├── mq/                消息队列生产/消费
├── param/             入参解析与封装（XxxParam）
├── request/           请求传输对象（XxxRequest / XxxQuery）
├── response/          响应传输对象（XxxResponse / ErrorResponse）
├── service/           Service 接口（XxxService；拥有表的继承 IService<XxxEntity>）
│   └── impl/           Service 实现（XxxServiceImpl extends ServiceImpl<XxxMapper, XxxEntity>）
├── sql/               SQL 片段与构建器
├── utils/             无状态通用工具，叶子包
├── vo/                视图输出对象（按需，XxxVo）
└── ui/                终端显示层，Web 项目不建
```

| 包 | 放什么 | 不放什么 | 命名 |
|---|---|---|---|
| controller | 路由、参数绑定与校验、DTO↔领域转换、状态码映射入口 | 业务判断、直调 mapper、SQL | `XxxController` |
| param | 请求参数的解析、聚合与默认值（如标签拆分、排序取值、分页参数） | 业务判断、数据库访问 | `XxxParam` |
| service | 业务规则与编排、事务边界、领域对象组装；拥有表的接口继承 `IService<XxxEntity>` | HTTP 框架类型、SQL、实体持久化细节 | `XxxService` / `XxxGateway`；无表的聚合与计算服务不继承 `IService` |
| service/impl | `@Service` 实现：继承 `ServiceImpl<XxxMapper, XxxEntity>`，跨表重复取数可下沉到 `AbstractServiceImpl` | controller 依赖、SQL 写在注解里 | `XxxServiceImpl` |
| mapper | MyBatis-Plus 映射接口（`extends BaseMapper<XxxEntity>`，必须标 `@Mapper`）；**注解里不写 SQL** | 业务规则、跨表 join 以外的复杂逻辑 | `XxxMapper` |
| entity | 表结构映射实体（`@TableName` + `@TableId` + 列映射方法） | 业务方法、跨层向上传递、传输对象 | `XxxEntity` |
| pojo | 业务语义 record（领域对象）与跨层结果载体（如 `PageResult`） | 持久化注解、传输对象、框架类型 | 领域名词（`Quote`） |
| manager | 第三方封装（返回值预处理、异常转化）、缓存等通用能力、多服务组合复用 | 具体业务规则、对 controller 直接暴露 | `XxxManager` |
| mapper XML | `<select id="...">` 复杂查询：join、分组、聚合、分页 | 单表可表达的查询、业务规则 | `resources/mapper/XxxMapper.xml` |
| request | 请求体 / 查询参数 record，与契约入参 schema 一一对应 | 业务方法、持久化注解、出参对象 | `XxxRequest` / `XxxQuery` |
| response | 响应体 record，与契约出参 schema 一一对应；service→controller 的结果载体也放这里 | 业务方法、持久化注解、入参对象 | `XxxResponse` / `XxxResult` / `ErrorResponse` |
| vo | 响应形状与领域 record 显著不同的视图对象 | 复制粘贴领域字段、持久化注解 | `XxxVo` |
| constant | 静态字典、阈值、上限值 | 枚举、业务规则、可变状态 | `XxxConstant` |
| enums | 业务枚举（含 wire 值与显示文案） | 静态字典、带条件判断的分类逻辑 | `XxxEnum` |
| sql | 复用的 SQL 片段、构建器 | 业务规则、结果集映射 | `XxxSql` |
| utils | 无状态通用工具（如 `JsonListUtils`） | 业务状态、依赖业务包 | `XxxUtils` 或通用名词 |
| aspect | AOP 切面（日志、耗时、审计） | 业务规则 | `XxxAspect` |
| annotation | 自定义注解定义 | 切面实现、业务逻辑 | `Xxx` 或 `@Xxx` |
| interceptor | MVC 拦截器（认证、限流） | 业务规则 | `XxxInterceptor` |
| mq | 生产者、监听器 | 业务规则（编排留在 service） | `XxxProducer` / `XxxListener` |
| config | `@Configuration` 装配类、Web 组件注册 | 业务判断、数据访问逻辑 | `XxxConfig` |
| exception | 业务异常基类 `BusinessException`（带 `code` 与 `HttpStatus`）及其子类 | `@RestControllerAdvice`、状态码映射、正常分支控制 | `XxxException`（含 `BusinessException`） |
| handler | 全局异常处理器（`@RestControllerAdvice`）、参数解析器等 Web 横切组件 | 业务异常定义（放 exception）、业务规则 | `GlobalExceptionHandler` / `XxxHandler` |
| ui | 桌面视图、服务端模板 | 业务规则、直调 mapper | `XxxView` / `XxxFrame` |

- **后缀区分语义，不许含糊。** 每个类必须以所在包的后缀结尾：`XxxController`、`XxxParam`、`XxxService`、`XxxServiceImpl`、`XxxMapper`、`XxxEntity`、`XxxEnum`、`XxxConstant`、`XxxRequest`/`XxxQuery`（request）、`XxxResponse`/`XxxResult`（response）、`XxxVo`、`XxxUtils`、`XxxConfig`、`XxxException`。看到后缀即可判断该放哪个包，反之亦然。
- **异常两段式（唯一入口）。** 所有业务异常 MUST 继承 `exception/BusinessException`，构造时给契约错误码与 HTTP 状态；`handler/GlobalExceptionHandler` 只写一到三个 `@ExceptionHandler`（`BusinessException`、框架解析异常、`Exception` 兵底），不得再为每个异常手写一个方法。新增错误码时只加子类，不改处理器。
- **MyBatis-Plus 三段式。** controller → `service`（接口）→ `service/impl`（`ServiceImpl<Mapper, Entity>`）→ `mapper`（`BaseMapper`）→ 表；拥有表的接口继承 `IService<XxxEntity>`，不再单独建 `repository` / `dao` 包（它们与 `mapper` / `service` 职责重合）。
- **SQL 位置。** 注解（`@Select` / `@Update` …）里不写 SQL；单表条件与排序用 `LambdaQueryWrapper`，取一行用分页包一层，跨表 join / 分组 / 聚合 / 分页写 `resources/mapper/*.xml`。
- **请求与响应分包。** 入参（请求体、查询参数）放 `request`，出参（响应体、`ErrorResponse`、service→controller 的结果载体）放 `response`，不再用单一 `dto` 包混放。
- `entity` 只放表结构映射（`XxxEntity`，带 `@TableName` / `@TableId`，附 `toXxx()` 转换），只允许 `mapper` 与 `service/impl` 引用；`pojo` 只放业务语义 record。**两者不是一个东西：实体随表变，领域对象随业务变。**
- 仍禁止 `model` / `dto` / `do` / `bo` / `req` / `resp` 等同义包。`param`（入参解析）与 `request`（入参 record）职责不同，两者都保留；`vo` 只在响应形状与 `pojo` 领域对象明显不同时才建。
- `constant` 只放静态字典与阈值（`XxxConstant`），`enums` 只放枚举（`XxxEnum`，含 wire 值与显示文案）；两类不混放，带条件判断的分类逻辑留在 service。config 只做装配。
- 日志统一用 Lombok `@Slf4j`，不手写 `LoggerFactory`；`logback-spring.xml` 的 appender 固定为 `STDOUT` / `TRACE_FILE` / `ERROR_FILE`，日志落 `backend/logs/`（`LOG_PATH` 可覆盖），不入库。
- manager 是可选层：只有引入第三方 SDK 且需要返回值预处理、异常转化或缓存等横切能力时才建；单纯端口与本地桩实现留在 service。
- 前端目录与文件命名以 `@rule:web-coding-style` 为准，不进 Java 包；Web 项目不建 ui 包。
- 阿里手册的 DO/DTO/BO/Query/VO 是概念分类，映射到本仓库既有命名：DO→`XxxEntity`（entity）、DTO→`XxxRequest`（request）/`XxxResponse`（response）、BO→领域 record（pojo）、Query→`XxxQuery`（request）、VO→`XxxVo`（vo，按需）；**不整体改名 `XxxDO`/`XxxDTO`**。

### 依赖方向

```text
ui / controller → param / service（接口）→ service/impl（可选 manager）→ mapper → 表
controller → request / response；service → request / response / pojo / vo / constant / enums
service/impl → mapper / entity / pojo / utils；mapper XML 只引用 entity
config → 各层（仅装配）
各层 → exception / utils；utils 不反向依赖任何业务包
handler → exception / response / 各层（仅横切，不反向）
aspect / interceptor → 各层（仅横切）
```

- controller 不得绕过 service 直调 mapper；service 不得反向依赖 controller/ui；`pojo` 的领域 record、`constant`、`enums` 不导入框架类型。
- service 接口是 controller 的唯一依赖；实现细节（`ServiceImpl`、XML 查询）不得向上泄漏。
- 有 manager 层时第三方调用只走 manager；无 manager 时 service 直连 mapper。
- `handler` 只做异常→响应的横切映射，不得承载业务判断；异常类型定义留在 `exception`。

### 分层异常职责

| 层 | 异常职责 |
|---|---|
| mapper / mapper XML | 包装存储异常向上抛，不吞掉、不打日志 |
| service/manager | 向上抛时带参数上下文记录日志；业务拒绝抛 `exception` 下继承 `BusinessException` 的子类 |
| handler | `GlobalExceptionHandler` 按 `BusinessException.code()/status()` 映射错误码与状态码，不返回堆栈 |
| 前端 `api.ts` | 抛 `Error(code)`，用契约错误码原值 |

### 仓库级结构

```text
<repo>/
├── openapi.yaml                          契约 SoT（见 api-contract）
├── backend/src/main/java/<root-package>/ Java 后端
├── backend/src/main/resources/db/migration/  迁移只增不改
├── backend/src/test/java/<root-package>/ 测试与被测类同层包
├── frontend/                             React 前端（见 web-coding-style）
├── e2e/                                  端到端测试
├── docs/                                 知识库与规则权威区
├── openspec/                             规格工件
└── scripts/                              验证与治理脚本
```

按特性平铺时，仓储接口、行对象与领域对象都放业务包，升级为按层时一次性搬移；类职责后缀仍以本规则分类为准。测试包与被测类同层同包，HTTP 接口级测试放 controller（细则见 `@rule:java-testing`）。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 导入/包依赖方向是否符合本文件声明，utils 是否反向依赖业务包 | pre-commit / pr-merge |
| 跨层捷径是否有 ADR 或例外记录 | pr-merge |
| 包是否按 `<root-package>/<layer>` 组织，是否混入业务域目录或半平铺半分层 | pr-merge |
| constant 是否只放枚举与静态字典，config 是否只做装配 | pr-merge |
| controller 是否含业务判断或直调 mapper | pr-merge |
| 是否有 `repository` / `dao` 包，或者 `model` / `dto` 与 `entity` / `pojo` 并存 | pr-merge |
| 注解里是否写了 SQL（`@Select`/`@Update`…）；跨表查询是否落在 `resources/mapper/*.xml` | pr-merge |
| 拥有表的 service 是否继承 `IService<XxxEntity>`，实现是否在 `service/impl` 并继承 `ServiceImpl` | pr-merge |
| `XxxMapper` 是否标 `@Mapper`，且 XML namespace 与接口一致 | pr-merge |
| 业务异常是否继承 `BusinessException` 并以 `Exception` 结尾，`GlobalExceptionHandler` 是否为唯一异常映射入口 | pr-merge |
| 请求对象是否在 `request`、响应对象是否在 `response`（不得再建笼统的 `dto`） | pr-merge |
| `XxxEntity` 是否只被 mapper 与 `service/impl` 引用，request/response/param 是否进入 mapper/entity | pr-merge |
| Web 项目是否建 ui，是否建空 manager，是否出现无声明用途的空包目录 | pr-merge |
| 类名后缀是否与所在包一致（`XxxMapper` 在 mapper、`XxxEntity` 在 entity、`XxxServiceImpl` 在 service/impl、`XxxEnum` 在 enums、`XxxException` 在 exception…） | pr-merge |
| service 接口的方法是否带 `/** ... @param ... @return ... */` 注释 | pr-merge |
| 日志是否用 `@Slf4j`，是否残留 `LoggerFactory` | pr-merge |
| 前端目录是否符合层语义，业务逻辑是否进组件 | pr-merge |
| 包依赖图中是否有环（见 `no-circular-dependency`） | pre-commit / pr-merge |

### 示例

```text
推荐：routeme.controller.QuoteController → routeme.request.QuoteCreateRequest
      → routeme.service.QuoteService（extends IService<QuoteEntity>）
      → routeme.service.impl.QuoteServiceImpl（extends ServiceImpl<QuoteMapper, QuoteEntity>）
      → routeme.mapper.QuoteMapper（extends BaseMapper<QuoteEntity>，@Mapper）→ 表
推荐：QuoteServiceImpl 用 routeme.pojo.Quote（record）做业务返回，用 routeme.entity.QuoteEntity 做持久化
推荐：简单条件用 LambdaQueryWrapper；join / 分组 / 分页写 resources/mapper/QuoteMapper.xml
推荐：service 抛 QuoteNotFoundException extends BusinessException → GlobalExceptionHandler 统一映射
推荐：需要跨服务复用的第三方封装 → QuoteGatewayManager
不推荐：再建 repository / dao 包包裹 mapper（与 service、mapper 职责重合）
不推荐：在 @Select 注解里写 SQL（应写 mapper XML 或 LambdaQueryWrapper）
不推荐：QuoteController 直接注入 QuoteMapper（跨层捷径）
不推荐：QuoteUtils 里写会员折扣等业务判断（utils 承载业务）
不推荐：新增一个异常就在处理器里加一个 @ExceptionHandler（应继承 BusinessException）
不推荐：手写 LoggerFactory（应用 Lombok @Slf4j）
```

### 例外

- 纯计算型项目（无数据库、无 Web）不建 controller/mapper/ui；桌面项目不建 controller。
- 非 Web 平铺代码不强制搬迁；达到分层触发条件或下次因业务变更修改该文件时收口。
- 根包名与「复数资源」等契约约定不一致时，必须在 `openspec/changes/<change-id>/design.md` 记录例外（如 RouteME 的 `routeme` 与单例 `/greeting`）。

## no-circular-dependency

**模块依赖图必须无环。** 依赖图以包或模块为粒度，不以文件为粒度。

- 破除循环的方式是端口/接口，或抽出共享内核模块。
- 不允许用动态导入、运行时反射把循环藏起来并长期保留。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 包依赖图中的环检测 | pre-commit / pr-merge |

### 示例

```text
推荐：共享类型放在叶子模块，由两侧共同导入。
不推荐：A → B → A 的包导入。
```

### 例外

例外：无。

## orchestration-execution-separation

**编排层不承载业务判断。**

- 编排/工作流层只负责路由与排序，不写领域策略判断；业务判断留在有测试的领域或能力模块里。
- 提示词与工具可以辅助执行模块，但编排层依然不能拥有策略。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 架构评审：编排器里是否出现业务策略 | pr-merge |

### 示例

```text
推荐：编排器调用领域服务里的 decideRefund()。
不推荐：编排器内嵌退款资格判断的 if/else 树。
```

### 例外

例外：无。

## java-patterns

**Java 模式与持久化约定。** 适用于 Java 项目；Spring Boot + JPA/JDBC + Flyway 项目以持久化小节为准。

### 通用模式

- 服务抽象：业务规则在 `service` 接口上声明，实现放 `service/impl`；拥有数据表的服务接口继承 `IService<XxxEntity>`，实现继承 `ServiceImpl<XxxMapper, XxxEntity>`（MyBatis-Plus）。
- 服务层承载业务逻辑，Controller 与 Mapper 保持薄。
- 构造注入优先，禁止字段注入（`@Inject` / `@Autowired` 直接标字段）。
- DTO 用 `record`，映射发生在服务或 Controller 边界。
- 参数较多的对象用 Builder；领域结果有互斥分支时用 sealed 接口 + switch 穷举。

### 迁移脚本只增不改

- 已提交的迁移（如 `V1__create_quotes.sql`）不再编辑；新增变更写 `V2__...`。
- 命名 `V<序号>__<动词_名词>.sql`，固定放 `src/main/resources/db/migration`。
- 修改已上线结构时先加新列或新表，再在后续迁移里清理旧结构，不做原地改定义。

### 时间统一 UTC

- 时间列 `created_at`、`updated_at` 存 UTC，接口输出 RFC3339（字段规则见 `@rule:api-contract`）。
- 取时间走可注入的时钟（如 `QuoteClock`），不在业务代码里直接 `Instant.now()`，否则测试无法固定时间。

### 实体与领域对象分离

- 持久化实体（如 `QuoteEntity`，`@TableName`，放 `entity`）映射表结构，领域对象（如 `Quote`，record，放 `pojo`）承载业务语义。
- 不给领域 record 标注持久化注解；实体只被 mapper 与 `service/impl` 引用，向上转成领域对象。
- service 接口的每个方法 MUST 写 Javadoc，至少含一句话说明与 `@param` / `@return`；实现类用类级注释说明实现要点，不重复接口注释。

### 数据访问位置

- 表 CRUD 由 `mapper`（`XxxMapper extends BaseMapper<XxxEntity>`，标 `@Mapper`）提供；简单条件用 `LambdaQueryWrapper`，复杂 join / 分组 / 分页写 `resources/mapper/XxxMapper.xml`。
- **注解里不写 SQL**；不再建 `repository` / `dao` 包装层（与 `service`、`mapper` 职责重合）。
- 跨表重复取数（如取最大 id、取排序首行）下沉到 `AbstractServiceImpl`，不在每张表重复。
- 读取端口与外部系统端口（`XxxGateway`）定义在 service 包；实现需要返回值预处理、重试或异常转化时才建 manager 封装。
- 测试优先使用 `@SpringBootTest` + H2；需要验证 SQL 语义时，另标注 SQLite 集成测试。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 依赖是否通过接口注入，未使用字段注入 | pr-merge |
| 迁移脚本是否只增不改，命名是否为 `V<序号>__<动词_名词>.sql` | pr-merge |
| 时间是否存 UTC，取时间是否走可注入时钟而非 `Instant.now()` | pr-merge |
| 领域对象是否未被标注 JPA 注解，行对象与领域对象是否分离 | pr-merge |
| 仓储接口位置是否符合布局，实现是否可替换 | pr-merge |
| 端口接口是否在 service，实现是否按来源命名（`Database…` / `Logging…`） | pr-merge |

### 示例

```java
// 推荐 — 构造注入，字段不可变
public class NotificationService {
    private final EmailSender emailSender;

    public NotificationService(EmailSender emailSender) {
        this.emailSender = emailSender;
    }
}

// 不推荐 — 字段注入，无法直接构造测试
public class NotificationService {
    @Inject
    private EmailSender emailSender;
}
```

### 例外

- 现有代码与本文件不一致时，在下次因业务变更修改该文件时收口，不单开重构提交。
- 纯计算型项目（无数据库）不适用持久化小节。

## 为什么这样定

契约是两端并行的唯一交汇点：不先定稿就会出现「谁先改」的争论，金额用整数分、时间用 UTC 则消除了跨语言序列化与本地时区的歧义。分层与无环约束保证变更可以增量交付；编排与策略分离让业务规则始终有测试可依。持久化只增不改是因为已执行的迁移无法回滚；行对象与领域对象分离是为了让业务语义不被表结构绑住。包分类把「代码放哪」从个人习惯变成查表：评审按包名就能判定职责与方向；平铺阈值则让小项目不必过早支付分层成本。

分层与依赖方向写在同一条规则里，是因为它们本来就是同一个决定：层一旦划分，方向就随之确定，分成两条规则只会让例外记录出现两份并逐渐不一致。