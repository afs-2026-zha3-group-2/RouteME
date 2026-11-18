import { defineConfig } from '@playwright/test';

// 默认沿用本地 5173；独立 worktree / 分片验证时用 ROUTEME_E2E_BASE_URL 指向自己的前端实例。
//
// 单后端 + 单 SQLite 时不要提高 workers：`credit-learning.spec.ts` 直接写库，
// 多条 spec 又会改动种子用户 1-4。需要并行请用 scripts/e2e-shard.mjs（每个分片一套独立环境）。
const workers = Number(process.env.E2E_WORKERS ?? 1);
const retries = Number(process.env.E2E_RETRIES ?? 0);
const trace = (process.env.E2E_TRACE ?? 'retain-on-failure') as
  | 'off'
  | 'on'
  | 'retain-on-failure'
  | 'on-first-retry';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: process.env.E2E_FULLY_PARALLEL === '1',
  workers: Number.isFinite(workers) && workers > 0 ? workers : 1,
  retries: Number.isFinite(retries) && retries >= 0 ? retries : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.ROUTEME_E2E_BASE_URL ?? 'http://localhost:5173',
    trace,
  },
});