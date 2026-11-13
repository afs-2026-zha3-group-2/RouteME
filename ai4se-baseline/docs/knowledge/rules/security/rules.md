# 安全规则（security）

本文件是该分类的权威正文。规则 ID 即二级标题，`@rule:<id>` 与索引中的 `#<id>` 都指向本文件里的同名小节。

## 适用范围

所有会进入生产路径的改动。`security-baseline` 是常开底线（含凭据与错误信息约束），`no-hardcoded-secrets` / `pii-scrubbing` / `prompt-injection-defense` 分别管凭据、个人信息与提示注入，`java-security` 是 Java 栈的具体做法。错误码与状态码映射以 `@rule:api-contract` 为准，本文件只管「不能泄露什么」。

## 规则总表

| ID | 规则 | 优先级 | 触发 | 适用栈 |
|---|---|---|---|---|
| security-baseline | 强制安全检查基线 | Critical | always | — |
| no-hardcoded-secrets | 禁止硬编码凭据 | Critical | always | — |
| pii-scrubbing | 日志与模型上下文脱敏 | Critical | auto | — |
| prompt-injection-defense | 防御提示注入 | Critical | auto | — |
| java-security | Java 安全做法 | Critical | always | java |

## security-baseline

**强制安全检查基线。** 任何触及生产路径的提交前确认下列清单；发现问题立即停下，先修 CRITICAL 项、轮换已暴露凭据，再排查同类缺陷是否在别处也存在。

### 必查清单

- [ ] 没有硬编码凭据（详见 `no-hardcoded-secrets`）
- [ ] 用户输入在信任边界处校验
- [ ] 已防注入（参数化查询 / 安全 API，禁止字符串拼接 SQL）
- [ ] 已防 XSS（对不可信 HTML 编码或净化）
- [ ] 会话 Cookie 认证的状态变更请求已开启 CSRF 防护
- [ ] 本次变更的认证与授权已验证（授权在服务边界判定，UI 隐藏不算）
- [ ] 暴露端点有限流，或已记录例外
- [ ] 错误信息不泄露凭据、堆栈内部信息或个人信息

### 响应流程

1. 停止受影响路径上的功能开发。
2. 判定严重度（CRITICAL 阻断合并）。
3. 先修 CRITICAL 再继续，轮换已暴露的凭据。
4. 在代码库中检索同类模式。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 安全敏感改动的 PR 中是否附凭据扫描结果与清单确认 | pre-commit / pr-merge |

### 示例

```text
推荐：新端点使用参数化查询、校验输入、凭据从密钥存储读取。
不推荐：处理器用字符串拼接 SQL，并把原始异常文本返回给客户端。
```

### 例外

- 隔离沙箱中的非生产试验，在明确标注且不可能合入受保护分支时，可暂缓限流配置。

## no-hardcoded-secrets

**禁止硬编码凭据。** 源码与文档里都不提交 API key、token、密码、私钥。

- 凭据通过密钥存储（Vault、云厂商密钥服务）或环境变量注入，并在环境规则里记录；含密配置放 `.gitignore`，不提交。
- 一旦暴露立即轮换，并检索同类写法。
- 日志与错误响应中同样不得出现凭据原文。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 凭据扫描是否通过，是否从环境或密钥存储读取 | pre-commit / pr-merge |

### 示例

```java
// 推荐
String apiKey = System.getenv("PAYMENT_API_KEY");
Objects.requireNonNull(apiKey, "PAYMENT_API_KEY must be set");

// 不推荐
private static final String API_KEY = "sk-live-...";
```

### 例外

例外：无。

## pii-scrubbing

**日志与模型上下文脱敏。** 默认不记录原始个人信息（姓名、电话、证件号、支付数据）。

- 需要时在进入遥测或模型上下文前做脱敏或哈希。
- 允许处理个人信息的路径必须记录保留期。
- 接口响应不返回超出业务需要的个人字段（如统计接口不返回姓名、手机、邮箱）。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 日志抽样与脱敏器测试 | pr-merge / runtime |

### 示例

```text
推荐：日志只存 user_id 的哈希。
不推荐：debug 日志里出现完整护照号。
```

### 例外

例外：无。

## prompt-injection-defense

**防御提示注入。**

- 不把不可信用户内容无边界地拼进系统提示词；用户文本作为结构化数据字段传入并带明确分隔符。
- 模型输出触发的工具与文件访问必须白名单化并校验。
- 检索到的文档视为不可信数据，不是指令。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 提示词构造评审与运行时防护 | pr-merge / runtime |

### 示例

```text
推荐：用户文本作为结构化数据字段传入，并带明确分隔符。
不推荐：system = base + user_message，没有任何隔离。
```

### 例外

例外：无。

## java-security

**Java 安全做法。** 凭据管理见 `no-hardcoded-secrets`，错误响应格式见 `@rule:api-contract`；本规则只写 Java 侧的具体 API 与检查点。

### SQL 注入防护

- 一律使用参数化查询，禁止把用户输入拼进 SQL。
- 用 `PreparedStatement` 或框架的参数化 API（如 `JdbcTemplate` 的 `?` 占位）。
- 原生查询里用到的输入仍要校验与净化。

```java
// 不推荐 — 字符串拼接导致注入
Statement stmt = conn.createStatement();
String sql = "SELECT * FROM orders WHERE name = '" + name + "'";
stmt.executeQuery(sql);

// 推荐 — 参数化
PreparedStatement ps = conn.prepareStatement("SELECT * FROM orders WHERE name = ?");
ps.setString(1, name);
```

### 输入校验

- 在系统边界先校验再处理；用 Bean Validation（`@NotNull`、`@NotBlank`、`@Size`）标注 DTO。
- 文件路径与用户提供的字符串使用前净化；校验失败快速拒绝并给出明确消息。

```java
public Order createOrder(String customerName, BigDecimal amount) {
    if (customerName == null || customerName.isBlank()) {
        throw new IllegalArgumentException("customer name is required");
    }
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalArgumentException("amount must be positive");
    }
    return new Order(customerName, amount);
}
```

### 认证与授权

- 不自行实现加密算法，使用成熟库；密码用 bcrypt 或 Argon2 存储，绝不用 MD5 / SHA1。
- 授权检查在服务边界执行；前端隐藏不是安全边界。
- 演示用身份桩（如 `X-User-Id`）必须在生产前替换，并作为遗留风险登记。

### 依赖安全

- 用 `mvnw.cmd dependency:tree` 审计传递依赖。
- 用 OWASP Dependency-Check 或同类工具扫描已知 CVE；依赖保持更新，配置 Dependabot 或 Renovate。

### 错误信息

- API 响应不暴露堆栈、内部路径与 SQL 错误，只返回契约定义的 `code`。
- 服务端记录详细错误（含参数上下文），客户端只拿通用提示。

### 检查项

| 检查 | 阻断点 |
|---|---|
| 是否全部参数化查询，无字符串拼接 SQL | pr-merge |
| 边界输入是否校验，错误响应是否泄露内部信息 | pr-merge |
| 密码哈希算法是否合规，授权检查是否在服务边界 | pr-merge |
| 演示身份桩是否已登记为生产前必须替换的遗留风险 | pr-merge |

### 例外

- 现有代码与本规则不一致时，在下次因业务变更修改该文件时收口，不单开重构提交。

## 为什么这样定

一条常开的安全基线能挡住 agent 与代码生成最常见的疏漏，而不必等到专项安全评审；凭据、个人信息与提示注入之所以单列，是因为它们的失败模式各不相同（泄露、合规、越权执行），修复动作也不同。Java 一节只写基线在具体 API 上的落点，避免「知道要防注入但写不出来」。

基线与 Java 规则之间用指针而不是复制条款，是为了让「凭据从哪来」「错误信息能露什么」只有一处判据；安全条款一旦出现两个版本，最坏的情况是两边都以为对方覆盖了。