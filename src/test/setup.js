// Se ejecuta una sola vez antes de correr los tests (lo configura
// vite.config.js en test.setupFiles). Acá va todo lo que el navegador de
// verdad tiene pero jsdom no.

// Agrega los "matchers" de jest-dom: toBeInTheDocument(), toHaveValue(), etc.
// Sin esto, expect(elemento).toBeInTheDocument() no existiría.
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Después de cada test desmontamos lo que se haya renderizado. Si no, los
// componentes de un test quedarían en pantalla durante el siguiente y las
// búsquedas por texto encontrarían cosas de más.
afterEach(() => {
  cleanup();
});

// --- Cosas del navegador que jsdom no trae ---

// window.matchMedia: lo usa el hook useMediaQuery de Mantine (por ejemplo en
// AdminProductsPage, para el modal a pantalla completa en celular). jsdom no
// lo implementa, así que devolvemos siempre "no coincide" = pantalla grande.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// ResizeObserver: lo usan por dentro varios componentes de Mantine (ScrollArea,
// Select…). Como en los tests no hay layout real, alcanza con una versión vacía.
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// scrollIntoView: lo llama el Select de Mantine al abrir la lista de opciones.
window.HTMLElement.prototype.scrollIntoView = vi.fn();
