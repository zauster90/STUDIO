import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    open: true,
  },
  define: {
    // Your GitHub repo and OAuth worker
    'import.meta.env.VITE_GITHUB_REPO': JSON.stringify('zauster90/STUDIO'),
    'import.meta.env.VITE_GITHUB_BRANCH': JSON.stringify('main'),
    'import.meta.env.VITE_OAUTH_BASE_URL': JSON.stringify('https://sveltia-cms-auth.zauster-art.workers.dev'),
  },
});
