import { defineConfig } from 'vite';
export default defineConfig({build:{rollupOptions:{output:{manualChunks:{react:['react','react-dom'],supabase:['@supabase/supabase-js']}}}}});
