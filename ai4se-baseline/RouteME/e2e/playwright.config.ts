import { defineConfig } from '@playwright/test';

// 默认沿用本地 5173；独立 worktree 验证时用 ROUTEME_E2E_BASE_URL 指向自己的前端实例。
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.ROUTEME_E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
});