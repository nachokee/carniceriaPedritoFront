import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Configuración de los tests unitarios y de componentes (Vitest).
  // Vitest reusa este mismo archivo, así que los tests se compilan igual que
  // la app: no hay que configurar Babel ni nada aparte.
  test: {
    // globals: deja usar describe/it/expect sin importarlos en cada archivo.
    globals: true,

    // jsdom simula un navegador (document, window) dentro de Node, para que
    // los componentes de React se puedan renderizar sin abrir Chrome.
    environment: 'jsdom',

    // Se ejecuta una vez antes de todos los tests (ver el archivo).
    setupFiles: './src/test/setup.js',

    // Qué archivos son tests. Están al lado del código que prueban:
    // src/format.js  →  src/format.test.js
    include: ['src/**/*.{test,spec}.{js,jsx}'],

    // Los tests de Playwright viven en e2e/ y los corre otro comando
    // (npm run test:e2e). Sin esto, Vitest intentaría ejecutarlos y fallaría.
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
