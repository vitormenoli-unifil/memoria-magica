import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';  // importamos o plugin Tailwind para Vite

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),   // adicionamos o plugin aqui
  ],
});