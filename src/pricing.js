// Precios de venta, en un solo lugar.
//
// Un producto en oferta tiene dos precios: el de lista (product.price) y el que
// se cobra de verdad (el de lista menos el descuento). Esa cuenta vivía adentro
// de catalogApi.getOffers(), así que la pantalla de inicio mostraba el precio
// con descuento pero el catálogo y el carrito seguían usando el de lista: el
// cliente veía "-15%" en la home y pagaba el precio entero. Ahora la cuenta
// está acá y la usan todos.

// Rango permitido para un descuento. Menos de 1% no se nota, y más de 90%
// casi siempre es un error de tipeo (un 0 de más) y no una oferta de verdad.
export const MIN_DISCOUNT_PERCENT = 1;
export const MAX_DISCOUNT_PERCENT = 90;

// Recorta el porcentaje al rango permitido. El formulario de admin ya no deja
// guardar nada fuera de rango, pero un producto viejo o un backend distraído
// pueden mandar cualquier cosa: sin esto, un 150% daría un precio negativo.
function clampPercent(percent) {
  return Math.min(Math.max(percent, 0), MAX_DISCOUNT_PERCENT);
}

// Devuelve los datos de precio de un producto, listos para mostrar o cobrar:
//
//   { price, originalPrice, isOnOffer, discountPercent }
//
// - price: lo que hay que cobrar (ya con el descuento, si está en oferta).
// - originalPrice: el precio de lista, para mostrarlo tachado al lado.
// - isOnOffer / discountPercent: para el badge "-15%".
//
// Cuando no hay oferta, price y originalPrice son el mismo número: así la
// pantalla usa siempre `price` y no tiene que preguntar nada.
export function getDisplayPrice(product) {
  const originalPrice = Number(product?.price) || 0;
  const percent = clampPercent(Number(product?.discountPercent) || 0);

  // Un producto marcado como oferta pero con 0% de descuento no es una oferta:
  // si lo tratáramos como tal, mostraríamos un badge "-0%" y el mismo precio
  // dos veces, uno tachado y el otro no.
  const isOnOffer = Boolean(product?.onOffer) && percent > 0;

  if (!isOnOffer) {
    return {
      price: originalPrice,
      originalPrice,
      isOnOffer: false,
      discountPercent: 0,
    };
  }

  return {
    // Math.round redondea a pesos enteros: sin eso, 8900 * 0.85 da algo como
    // 7564.999999 por cómo la computadora guarda los decimales.
    price: Math.round(originalPrice * (1 - percent / 100)),
    originalPrice,
    isOnOffer: true,
    discountPercent: percent,
  };
}
