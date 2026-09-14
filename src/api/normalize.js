// Ayudas para "traducir" lo que devuelve el backend a la forma que esperan las
// pantallas. Se usan SOLO en la rama real de cada api/ (los mocks ya vienen con
// la forma correcta).
//
// La idea: si Spring devuelve algo con otro nombre, otro tipo o envuelto en un
// objeto de paginación, se arregla acá y ningún componente se entera.

// Spring Data devuelve las listas paginadas como { content: [...], totalElements }.
// Esto acepta las dos formas y siempre devuelve un array.
export function unwrapList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.content ?? [];
}

// BigDecimal de Java suele serializarse como el string "8900.00". Si lo dejamos
// pasar, las sumas concatenan texto en vez de sumar.
export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Los enums de Java se escriben LISTO_PARA_RETIRAR. Nuestras pantallas usan
// 'listo para retirar' (ver src/orderStatus.js).
export function normalizeStatus(status) {
  return String(status ?? '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
}

// El camino inverso, para cuando le MANDAMOS un estado al backend.
// Si el back no usa UPPER_SNAKE, esta es la única línea que hay que cambiar.
export function toWireStatus(status) {
  return String(status ?? '').toUpperCase().replace(/ /g, '_');
}
