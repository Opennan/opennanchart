import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {licenseBanner} from './vite.license';
export default defineConfig({
  plugins:[react()],
  server:{host:'127.0.0.1',port:3030,strictPort:true,proxy:{'/api':'http://127.0.0.1:3031'}},
  build:{outDir:'dist/demo',emptyOutDir:true,rollupOptions:{output:{banner:licenseBanner}}},
});
