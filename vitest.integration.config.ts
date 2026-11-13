import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Kredensial Supabase LOKAL (atau project tes terpisah). Jangan pernah project produksi.
for (const f of ['.env.test.local', '.env.local']) if (existsSync(f)) process.loadEnvFile(f);

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30000,
  },
});
