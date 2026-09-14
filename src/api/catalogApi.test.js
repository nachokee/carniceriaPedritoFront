import { beforeEach, describe, expect, it, vi } from 'vitest';

// Estos tests prueban la rama MOCKEADA de catalogApi (USE_MOCK_CATALOG es true
// por defecto). No sale ninguna llamada a la red.
//
// Detalle importante: la lista mockProducts vive dentro del módulo y algunas
// funciones la modifican (decreaseStock descuenta, createProduct agrega). Si
// importáramos el módulo una sola vez arriba, un test le dejaría el inventario
// cambiado al siguiente y el orden en que corren cambiaría el resultado.
//
// Por eso en cada test:
//   vi.resetModules()  → "olvidate del módulo que ya cargaste"
//   await import(...)  → lo vuelve a cargar de cero, con el stock original
let catalogApi;

beforeEach(async () => {
  vi.resetModules();
  catalogApi = await import('./catalogApi');
});

describe('getProducts', () => {
  it('devuelve la lista de productos del mock', async () => {
    const products = await catalogApi.getProducts();

    expect(products.length).toBeGreaterThan(0);

    // Chequeamos la FORMA de un producto, no el contenido exacto: si mañana
    // cambian los precios del mock, el test tiene que seguir pasando.
    expect(products[0]).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      price: expect.any(Number),
      unit: expect.any(String),
      category: expect.any(String),
    });
  });

  it('todos los productos tienen una categoría', async () => {
    const products = await catalogApi.getProducts();

    for (const product of products) {
      expect(product.category).toBeTruthy();
    }
  });

  // getProducts devuelve una COPIA a propósito. Si devolviera el array
  // original, quien lo reciba podría modificar el catálogo sin querer.
  it('devuelve una copia, no la lista original', async () => {
    const primera = await catalogApi.getProducts();
    const segunda = await catalogApi.getProducts();

    // Mismo contenido…
    expect(primera).toEqual(segunda);
    // …pero no es literalmente el mismo array en memoria.
    expect(primera).not.toBe(segunda);
  });
});

describe('getOffers', () => {
  it('devuelve solo los productos marcados como oferta', async () => {
    const offers = await catalogApi.getOffers();

    expect(offers.length).toBeGreaterThan(0);

    for (const offer of offers) {
      expect(offer.onOffer).toBe(true);
      expect(offer.discountPercent).toBeGreaterThan(0);
    }
  });

  it('no devuelve productos que no están en oferta', async () => {
    const products = await catalogApi.getProducts();
    const offers = await catalogApi.getOffers();

    const sinOferta = products.filter((product) => !product.onOffer);
    const idsEnOferta = offers.map((offer) => offer.id);

    for (const product of sinOferta) {
      expect(idsEnOferta).not.toContain(product.id);
    }
  });

  // Esta es la cuenta que más importa: si el descuento se calcula mal, el
  // cliente ve un precio que no es.
  it('calcula el precio con descuento', async () => {
    const offers = await catalogApi.getOffers();

    for (const offer of offers) {
      const esperado = Math.round(offer.price * (1 - offer.discountPercent / 100));

      expect(offer.discountedPrice).toBe(esperado);
      // El precio con descuento siempre tiene que ser menor al original.
      expect(offer.discountedPrice).toBeLessThan(offer.price);
    }
  });

  it('un 15% de descuento sobre 8900 da 7565', async () => {
    const offers = await catalogApi.getOffers();
    const asado = offers.find((offer) => offer.name === 'Asado de tira');

    expect(asado.price).toBe(8900);
    expect(asado.discountPercent).toBe(15);
    expect(asado.discountedPrice).toBe(7565);
  });

  // Sin el Math.round, 8900 * 0.85 da 7564.999999999999 por cómo la computadora
  // guarda los decimales, y en pantalla se vería "$ 7.565" pero el número
  // guardado sería otro.
  it('devuelve pesos enteros, sin decimales colgados', async () => {
    const offers = await catalogApi.getOffers();

    for (const offer of offers) {
      expect(Number.isInteger(offer.discountedPrice)).toBe(true);
    }
  });
});

describe('decreaseStock', () => {
  it('descuenta la cantidad comprada del stock', async () => {
    const antes = await catalogApi.getProducts();
    const asadoAntes = antes.find((product) => product.id === 1);

    await catalogApi.decreaseStock([{ productId: 1, quantity: 3 }]);

    const despues = await catalogApi.getProducts();
    const asadoDespues = despues.find((product) => product.id === 1);

    expect(asadoDespues.stock).toBe(asadoAntes.stock - 3);
  });

  it('descuenta varios productos de una sola vez', async () => {
    await catalogApi.decreaseStock([
      { productId: 1, quantity: 2 },
      { productId: 4, quantity: 5 },
    ]);

    const products = await catalogApi.getProducts();

    expect(products.find((p) => p.id === 1).stock).toBe(25 - 2);
    expect(products.find((p) => p.id === 4).stock).toBe(30 - 5);
  });

  // Comprar TODO lo que queda tiene que dejar el stock en 0 exacto,
  // nunca en negativo.
  it('deja el stock en 0 al comprar todo lo disponible', async () => {
    const antes = await catalogApi.getProducts();
    const chorizo = antes.find((product) => product.id === 5);

    await catalogApi.decreaseStock([
      { productId: 5, quantity: chorizo.stock },
    ]);

    const despues = await catalogApi.getProducts();

    expect(despues.find((p) => p.id === 5).stock).toBe(0);
  });

  it('falla si se pide más de lo que hay, y no descuenta nada', async () => {
    const antes = await catalogApi.getProducts();
    const chorizo = antes.find((product) => product.id === 5);

    // rejects.toThrow: esperamos que la promesa falle con un error.
    await expect(
      catalogApi.decreaseStock([{ productId: 5, quantity: chorizo.stock + 1 }]),
    ).rejects.toThrow(/stock suficiente/i);

    // Y lo más importante: el inventario quedó intacto.
    const despues = await catalogApi.getProducts();
    expect(despues.find((p) => p.id === 5).stock).toBe(chorizo.stock);
  });

  // Este es el caso feo: el primer producto sí tenía stock, el segundo no.
  // Si descontara sobre la marcha, el primero quedaría descontado y el pedido
  // a medio hacer. Por eso valida todo ANTES de tocar nada.
  it('no descuenta el primer producto si falla el segundo', async () => {
    const antes = await catalogApi.getProducts();
    const asadoAntes = antes.find((product) => product.id === 1);

    await expect(
      catalogApi.decreaseStock([
        { productId: 1, quantity: 1 },
        { productId: 5, quantity: 999 },
      ]),
    ).rejects.toThrow();

    const despues = await catalogApi.getProducts();
    expect(despues.find((p) => p.id === 1).stock).toBe(asadoAntes.stock);
  });

  it('falla si el producto ya no existe', async () => {
    await expect(
      catalogApi.decreaseStock([{ productId: 999, quantity: 1 }]),
    ).rejects.toThrow(/no está disponible/i);
  });
});

describe('createProduct y updateProduct', () => {
  it('crea un producto con categoría y le da un id nuevo', async () => {
    const creado = await catalogApi.createProduct({
      name: 'Matambrito de cerdo',
      price: 8100,
      unit: 'kg',
      stock: 7,
      category: 'Cerdo',
    });

    expect(creado.id).toEqual(expect.any(Number));
    expect(creado.category).toBe('Cerdo');

    // Y ahora aparece en el catálogo.
    const products = await catalogApi.getProducts();
    expect(products.map((p) => p.name)).toContain('Matambrito de cerdo');
  });

  it('cae en "Otros" si se crea un producto sin categoría', async () => {
    const creado = await catalogApi.createProduct({
      name: 'Algo sin clasificar',
      price: 1000,
      unit: 'kg',
      stock: 1,
    });

    expect(creado.category).toBe('Otros');
  });

  it('actualiza la categoría de un producto existente', async () => {
    await catalogApi.updateProduct(1, { category: 'Otros' });

    const products = await catalogApi.getProducts();

    expect(products.find((p) => p.id === 1).category).toBe('Otros');
    // Los demás campos quedaron como estaban.
    expect(products.find((p) => p.id === 1).name).toBe('Asado de tira');
  });

  it('borra un producto del catálogo', async () => {
    await catalogApi.deleteProduct(1);

    const products = await catalogApi.getProducts();

    expect(products.find((p) => p.id === 1)).toBeUndefined();
  });
});
