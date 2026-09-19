import { describe, expect, it } from 'vitest';
import {
  MAX_DISCOUNT_PERCENT,
  MIN_DISCOUNT_PERCENT,
  getDisplayPrice,
} from './pricing';

// Esta cuenta decide dos cosas a la vez: el precio que se MUESTRA en la
// vidriera y el que se COBRA en el carrito. Si dan distinto, el cliente ve un
// número y paga otro, que es justo el bug que vinimos a arreglar.

const asadoEnOferta = {
  id: 1,
  name: 'Asado de tira',
  price: 8900,
  onOffer: true,
  discountPercent: 15,
};

const vacioSinOferta = { id: 2, name: 'Vacío', price: 9500 };

describe('getDisplayPrice: productos sin oferta', () => {
  it('deja el precio como está', () => {
    const { price, originalPrice } = getDisplayPrice(vacioSinOferta);

    expect(price).toBe(9500);
    // price y originalPrice iguales: la pantalla puede usar siempre price.
    expect(originalPrice).toBe(9500);
  });

  it('marca isOnOffer en false y el descuento en 0', () => {
    const { isOnOffer, discountPercent } = getDisplayPrice(vacioSinOferta);

    expect(isOnOffer).toBe(false);
    expect(discountPercent).toBe(0);
  });

  it('no trata como oferta un producto marcado pero con 0% de descuento', () => {
    const raro = { price: 5000, onOffer: true, discountPercent: 0 };

    expect(getDisplayPrice(raro).isOnOffer).toBe(false);
    expect(getDisplayPrice(raro).price).toBe(5000);
  });
});

describe('getDisplayPrice: productos en oferta', () => {
  it('aplica el descuento al precio', () => {
    const { price, originalPrice, isOnOffer, discountPercent } =
      getDisplayPrice(asadoEnOferta);

    // 8900 - 15% = 7565
    expect(price).toBe(7565);
    expect(originalPrice).toBe(8900);
    expect(isOnOffer).toBe(true);
    expect(discountPercent).toBe(15);
  });

  it('devuelve pesos enteros, sin decimales colgados', () => {
    // Sin el Math.round, 8900 * 0.85 da 7564.999999999999.
    expect(Number.isInteger(getDisplayPrice(asadoEnOferta).price)).toBe(true);
  });

  it('el precio con descuento siempre es menor al de lista', () => {
    const { price, originalPrice } = getDisplayPrice(asadoEnOferta);

    expect(price).toBeLessThan(originalPrice);
  });
});

describe('getDisplayPrice: datos raros', () => {
  it('no rompe si le pasan undefined', () => {
    expect(getDisplayPrice(undefined).price).toBe(0);
  });

  it('acepta el precio como texto, como lo manda un BigDecimal de Java', () => {
    expect(getDisplayPrice({ price: '8900.00' }).price).toBe(8900);
  });

  it('nunca deja el precio en negativo, aunque el descuento sea absurdo', () => {
    // Un 150% sería un error de carga; lo recortamos al máximo permitido.
    const { price, discountPercent } = getDisplayPrice({
      price: 1000,
      onOffer: true,
      discountPercent: 150,
    });

    expect(discountPercent).toBe(MAX_DISCOUNT_PERCENT);
    expect(price).toBeGreaterThan(0);
  });

  it('un descuento negativo no encarece el producto', () => {
    const { price, isOnOffer } = getDisplayPrice({
      price: 1000,
      onOffer: true,
      discountPercent: -20,
    });

    expect(isOnOffer).toBe(false);
    expect(price).toBe(1000);
  });
});

describe('rango de descuentos', () => {
  it('el mínimo es menor que el máximo', () => {
    expect(MIN_DISCOUNT_PERCENT).toBeLessThan(MAX_DISCOUNT_PERCENT);
  });
});
