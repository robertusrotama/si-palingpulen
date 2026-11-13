import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Semua halaman aplikasi butuh sesi login, jadi dirender per request (tanpa Cache Components).
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
