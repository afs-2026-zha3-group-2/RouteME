import process from 'node:process';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// 端到端验证可以用 ROUTEME_API_TARGET 指向独立后端，避免与本地 8080 的会话抢占。
const apiTarget = process.env.ROUTEME_API_TARGET ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
