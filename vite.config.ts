import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base must match the GitHub Pages project path: https://estin68.github.io/smart_speaking/
export default defineConfig({
  plugins: [react()],
  base: '/smart_speaking/',
});
