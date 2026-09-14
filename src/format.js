// Formateo de plata y fechas, en un solo lugar.
//
// Antes cada pantalla escribía `${'$'}${item.price}` a mano y las fechas con
// toLocaleDateString repetido en tres archivos. Si mañana hay que cambiar la
// moneda o el formato, se cambia acá y listo.

// Intl.NumberFormat es del navegador, no hace falta instalar nada.
// Se crea una sola vez (crearlo es caro) y se reusa en cada llamada.
const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// 8900 → "$ 8.900"
export function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

// Devuelve null si la fecha no se puede leer, para no mostrar "Invalid Date".
function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "2026-09-08T12:15:00Z" → "8 sept 2026"
export function formatDate(value) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('es-AR', { dateStyle: 'medium' }) : '—';
}

// "2026-09-08T12:15:00Z" → "8 sept 2026, 09:15"
export function formatDateTime(value) {
  const date = parseDate(value);

  return date
    ? date.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
}
