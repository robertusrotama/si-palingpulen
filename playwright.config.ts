import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

for (const f of ['.env.test.local', '.env.local']) if (existsSync(f)) process.loadEnvFile(f);

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'off' },
  projects: [{ name: 'iphone', use: { ...devices['iPhone 14'], browserName: 'chromium' } }],
  webServer: {
    command: `npx next dev -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { E2E: '1', ALLOWED_EMAIL: 'e2e-signup@test.local' },
  },
});
