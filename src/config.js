// Configuración central del front.
//
// Un flag por microservicio: mientras está en true, ese api/ devuelve datos
// falsos; en false, pega contra el backend real. Como son independientes, se
// puede tener auth real y el resto mockeado, por ejemplo.
//
// Los valores se pueden pisar desde un archivo .env (ver .env.example) sin
// tocar este archivo:
//
//   VITE_USE_MOCK_AUTH=false
//
// OJO: import.meta.env devuelve siempre STRINGS. El string 'false' en JS es
// truthy (cualquier texto no vacío lo es), así que si escribiéramos
// `if (import.meta.env.VITE_USE_MOCK_AUTH)` daría true incluso valiendo
// 'false'. Por eso comparamos contra el texto.
function readFlag(value, fallback = true) {
  if (value === undefined) {
    return fallback;
  }

  return value !== 'false';
}

// URL base del backend. Si hay un API gateway adelante de los microservicios,
// esta es su dirección.
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

// Un flag por servicio. Todos arrancan mockeados.
export const USE_MOCK_AUTH = readFlag(import.meta.env.VITE_USE_MOCK_AUTH);
export const USE_MOCK_CATALOG = readFlag(import.meta.env.VITE_USE_MOCK_CATALOG);
export const USE_MOCK_ORDERS = readFlag(import.meta.env.VITE_USE_MOCK_ORDERS);
export const USE_MOCK_PAYMENTS = readFlag(import.meta.env.VITE_USE_MOCK_PAYMENTS);
export const USE_MOCK_INVOICES = readFlag(import.meta.env.VITE_USE_MOCK_INVOICES);
