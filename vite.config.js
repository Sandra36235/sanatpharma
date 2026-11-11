import { defineConfig } from 'vite';
// base relativa: la misma compilación funciona en GitHub Pages (/sanatpharma/) y en local.
export default defineConfig({base:'./',build:{rollupOptions:{output:{manualChunks:{react:['react','react-dom'],supabase:['@supabase/supabase-js']}}}}});
