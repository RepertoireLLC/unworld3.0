import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const devServerPort = Number(env.VITE_DEV_SERVER_PORT) || 5173;
  const previewPort = Number(env.VITE_PREVIEW_PORT) || 4173;

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      host: '0.0.0.0',
      port: devServerPort,
    },
    preview: {
      host: '0.0.0.0',
      port: previewPort,
    },
    build: {
      target: 'es2018',
      sourcemap: mode !== 'production',
      outDir: 'dist',
      emptyOutDir: true,
    },
    envPrefix: 'VITE_',
  };
});
