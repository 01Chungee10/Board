import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({
  root:'app',
  base:'/Board/',
  resolve:{alias:[{find:'./supabase.js',replacement:fileURLToPath(new URL('./support/mock-supabase.mjs',import.meta.url))}]},
  server:{host:'127.0.0.1'},
});
