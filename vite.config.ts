import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
// base: '/' para Cloudflare Pages (URL raíz)
// base: '/wekall-intelligence/' para GitHub Pages (subfolder)
// Se controla con VITE_BASE_URL en GitHub Actions
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_URL || '/',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-pdf': ['pdfjs-dist'],
          'vendor-xlsx': ['xlsx'],
        },
      },
    },
  },
});
