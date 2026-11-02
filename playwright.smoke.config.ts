import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
for (const [k, v] of Object.entries(env)) {
  if (process.env[k] === undefined) {
    process.env[k] = v;
  }
}

const targetUrl = process.env.SMOKE_BASE_URL || 'http://localhost:4174';
const isRemote = Boolean(process.env.SMOKE_BASE_URL);

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/smoke-llm.spec.ts'],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  reporter: 'list',
  use: {
    baseURL: targetUrl,
    trace: 'retain-on-failure',
    viewport: { width: 1024, height: 768 },
  },
  projects: [
    {
      name: 'chromium-tablet-smoke-llm',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
      },
    },
  ],
  webServer: isRemote
    ? undefined
    : {
        command: 'npm run build && npx vite preview --port 4174',
        url: 'http://localhost:4174',
        reuseExistingServer: false,
        env: {
          ...env,
          MOCK_LLM: 'false',
        },
      },
});
