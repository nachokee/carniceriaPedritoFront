import { defineConfig, devices } from '@playwright/test';

// Configuración de los tests end-to-end (de punta a punta).
//
// A diferencia de los tests de Vitest, que montan un componente suelto, estos
// abren un navegador de verdad, entran a la app y la usan como la usaría una
// persona: clickean, escriben y miran lo que aparece en pantalla.
//
// Todo corre contra los mocks (USE_MOCK_* en true, que es el valor por
// defecto), así que no hace falta tener el backend levantado.
export default defineConfig({
  // Dónde están los tests. Van en e2e/ y no en src/ para que no se mezclen
  // con los de Vitest, que se corren con otro comando.
  testDir: './e2e',

  // Si un test se cuelga, cortarlo a los 30 segundos en vez de esperar para
  // siempre.
  timeout: 30 * 1000,

  // Cuánto espera cada expect(...) a que aparezca lo que busca antes de fallar.
  // Los mocks tienen demoras a propósito (submitOrder espera 800ms y el pago
  // 1200ms), así que conviene un margen cómodo.
  expect: { timeout: 10 * 1000 },

  // En CI, si alguien se olvidó un test.only, que falle en vez de correr uno solo.
  forbidOnly: Boolean(process.env.CI),

  // Un reintento en CI (los e2e a veces fallan por tiempos), ninguno en local:
  // si falla en tu máquina, querés verlo.
  retries: process.env.CI ? 1 : 0,

  // Un solo worker: los tests comparten el mismo servidor de desarrollo y los
  // mocks guardan estado en memoria. De a uno es más lento pero más predecible.
  workers: 1,

  // Reporte en HTML. Se abre con: npx playwright show-report
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    // La dirección base: en los tests se escribe page.goto('/') y Playwright
    // le agrega esto adelante.
    baseURL: 'http://localhost:5173',

    // Guarda una "grabación" del test solo cuando falla, para poder ver paso a
    // paso qué pasó: npx playwright show-trace
    trace: 'on-first-retry',

    // Captura de pantalla automática cuando un test falla.
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Playwright levanta el servidor de desarrollo solo antes de correr los
  // tests y lo apaga al terminar.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    // Si ya tenés `npm run dev` abierto en otra terminal, lo reusa en vez de
    // fallar por el puerto ocupado. En CI siempre levanta uno limpio.
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
});
