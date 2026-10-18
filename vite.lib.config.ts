import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{outDir:'dist',emptyOutDir:false,lib:{entry:{opennanchart:'src/index.ts',engine:'src/engine/index.ts'},formats:['es']},rollupOptions:{external:['react','react-dom','react-dom/client','react/jsx-runtime']}}});
