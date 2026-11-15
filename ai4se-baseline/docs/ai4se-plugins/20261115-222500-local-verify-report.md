# 本地验证报告：apply-prototype-visual-design

- **日期：** 2026-11-15
- **范围：** `RouteME/frontend` 表现层（样式、主题、外壳、身份门、首页、卡片与页面外观）
- **环境：** Windows / Node.js（Vite 8.3.8）/ 后端 Spring Boot 已启动（8080）/ 前端 dev server（5173）

## 命令与结果

### 1. 类型检查与构建

```text
cd RouteME/frontend
npm run build
```

```text
> tsc --noEmit && vite build
vite v8.3.8 building client environment for production...
✓ 1512 modules transformed.
dist/index.html                   0.99 kB │ gzip:   0.67 kB
dist/assets/index-*.css          25.51 kB │ gzip:   6.32 kB
dist/assets/index-*.js          853.67 kB │ gzip: 271.16 kB
✓ built in 761ms
```

- 结果：通过；TypeScript 0 错误。Vite 仅提示单 chunk > 500 kB（既有现象，不是本次引入）。

### 2. 单元测试

```text
cd RouteME/frontend
npm test
```

```text
Test Files  6 passed (6)
     Tests  42 passed (42)
```

- 新增：`src/home/greeting.test.ts`（时段边界 6 例）、`describeFilters`（默认空摘要、全部条件顺序）。

### 3. 浏览器核对（Playwright，真实后端数据）

| 检查 | 结果 |
|---|---|
| 1440×900 首页 | 侧栏常驻；横幅 / 视图切换 / 筛选 / 卡片网格按原型层级呈现；无横向溢出（1430 = 1430） |
| 1024×844 首页 | 侧栏常驻；无横向溢出（1014 = 1014） |
| 768×844 首页 | 侧栏隐藏、底部标签栏出现；无横向溢出（758 = 758） |
| 390×844 首页 / 我的旅行 / 发布 | 单列；标签栏可达三项；无横向溢出（380 = 380） |
| 身份门 1440×900 | 三张身份卡并排；品牌、标语、价值闭环、说明齐全 |
| 行程详情 | 返回链接、状态、路线、发布者、同行者、体验区正常 |
| 主题切换 | `documentElement.dataset.theme` 由 `light` → `dark`；localStorage `routeme.colorMode` 写入并可读回 |
| 控制台 | 详情 / 我的旅行 / 发布页导航过程中 0 条 console error |
| 路由滚动 | 切换路由后 `window.scrollY === 0` |

### 4. 未执行

- `npx playwright test`（E2E）：按仓库现状属于本地门禁，本次未改文案与主要类名；如需回归另跑。
- 后端测试：本 change 未触碰后端。

## 结论

构建、类型检查与单元测试全绿；四档视口无横向溢出，导航切换与主题持久化符合 `spec.md` 的验收场景。残余风险见 `summary.md`。