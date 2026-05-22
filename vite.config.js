import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import hermesAgentPlugin from './vite-plugin-hermes.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ollamaTarget  = env.VITE_OLLAMA_URL  || 'http://localhost:11434'
  const obsidianTarget = env.VITE_OBSIDIAN_URL || 'http://127.0.0.1:27124'

  return {
  plugins: [
    react(),
    hermesAgentPlugin(),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    proxy: {
      // Route Ollama API through the dev server to avoid browser CORS blocks
      '/api/ollama': {
        target: ollamaTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
      },
      // Route Obsidian Local REST API through dev server as well
      '/api/obsidian': {
        target: obsidianTarget,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/obsidian/, ''),
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          gsap: ['gsap'],
          supabase: ['@supabase/supabase-js'],
          idb: ['idb'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'gsap', '@supabase/supabase-js', 'idb'],
  },
  }
})
