// Self-contained script-tag build, including React, for non-bundled integrations.
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {licenseBanner} from './vite.license';
export default defineConfig({plugins:[react()],define:{'process.env.NODE_ENV':JSON.stringify('production')},build:{outDir:'dist/demo',emptyOutDir:false,lib:{entry:'src/index.ts',name:'OpennanChart',formats:['iife'],fileName:()=> 'opennanchart.js'},rollupOptions:{output:{banner:licenseBanner}}}});
