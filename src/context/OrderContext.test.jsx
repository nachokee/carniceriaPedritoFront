import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderProvider, useOrder } from './OrderContext';

// El carrito se guarda en localStorage y, al volver, se revisa contra el
// catálogo. Reemplazamos catalogApi para decidir desde el test qué productos
// "existen hoy", sin depender del mock de verdad ni de sus demoras.
vi.mock('../api/catalogApi', () => ({ getProducts: vi.fn() }));

// Lo importamos DESPUÉS del vi.mock para quedarnos con la versión falsa.
import { getProducts } from '../api/catalogApi';

// La misma clave que usa OrderContext.
const STORAGE_KEY = 'carniceria_cart';

// El carrito es la lógica más delicada de la app: si suma mal, el cliente paga
// de más o de menos. Por eso es lo primero que conviene tener testeado.
//
// renderHook monta el hook useOrder() adentro del OrderProvider, sin necesidad
// de dibujar ninguna pantalla. result.current es lo que devuelve el hook
// (items, total, addItem, etc.) en el último render.
//
// act(...) envuelve todo lo que cambia el estado: le avisa a React "hice un
// cambio, terminá de procesarlo antes de que yo siga mirando". Sin act, los
// tests leerían el estado viejo.
function montarCarrito() {
  return renderHook(() => useOrder(), { wrapper: OrderProvider });
}

// Productos de mentira para los tests. Los escribimos acá y no los sacamos del
// mock de catalogApi para que un cambio en el catálogo no rompa estos tests.
const asado = { id: 1, name: 'Asado de tira', price: 8900, unit: 'kg', stock: 25 };
const pollo = { id: 4, name: 'Pollo entero', price: 4500, unit: 'kg', stock: 30 };
const casiAgotado = { id: 5, name: 'Chorizo criollo', price: 6800, unit: 'kg', stock: 2 };
const agotado = { id: 6, name: 'Milanesas', price: 10400, unit: 'kg', stock: 0 };

// Mismo asado, pero con 15% de descuento: 8900 - 15% = 7565.
const asadoEnOferta = { ...asado, onOffer: true, discountPercent: 15 };

// El catálogo "de hoy" por defecto: están los cuatro productos, con su stock
// original. Los tests que prueban la reconciliación lo pisan con el suyo.
beforeEach(() => {
  getProducts.mockResolvedValue([asado, pollo, casiAgotado, agotado]);
});

// Arma una fila de carrito como la que quedaría guardada en localStorage.
function itemGuardado(product, quantity) {
  return {
    productId: product.id,
    name: product.name,
    price: product.price,
    unit: product.unit,
    stock: product.stock,
    quantity,
  };
}

// Deja un carrito guardado, como si la persona hubiera cerrado la pestaña.
function dejarCarritoGuardado(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function leerCarritoGuardado() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? null : JSON.parse(stored);
}

describe('addItem', () => {
  it('agrega un producto nuevo con cantidad 1', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({
      productId: 1,
      name: 'Asado de tira',
      price: 8900,
      quantity: 1,
    });
  });

  it('suma 1 a la cantidad si el producto ya estaba, sin duplicar la fila', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));
    act(() => result.current.addItem(asado));
    act(() => result.current.addItem(asado));

    // Sigue habiendo UNA sola fila, con cantidad 3.
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
  });

  it('guarda cada producto en su propia fila', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));
    act(() => result.current.addItem(pollo));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items.map((item) => item.name)).toEqual([
      'Asado de tira',
      'Pollo entero',
    ]);
  });

  it('no deja pasar del stock disponible', () => {
    const { result } = montarCarrito();

    // Solo quedan 2, pero apretamos "agregar" cuatro veces.
    act(() => result.current.addItem(casiAgotado));
    act(() => result.current.addItem(casiAgotado));
    act(() => result.current.addItem(casiAgotado));
    act(() => result.current.addItem(casiAgotado));

    expect(result.current.items[0].quantity).toBe(2);
  });

  it('no agrega nada si el producto está agotado', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(agotado));

    expect(result.current.items).toHaveLength(0);
  });

  // stock undefined = el backend no controla stock. En ese caso no se topea nada.
  it('no topea la cantidad si el producto no tiene stock definido', () => {
    const { result } = montarCarrito();
    const sinControl = { id: 9, name: 'Costillar', price: 7000, unit: 'kg' };

    act(() => result.current.addItem(sinControl));
    act(() => result.current.addItem(sinControl));

    expect(result.current.items[0].quantity).toBe(2);
  });
});

describe('removeItem', () => {
  it('saca el producto del pedido y deja el resto', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));
    act(() => result.current.addItem(pollo));
    act(() => result.current.removeItem(1));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Pollo entero');
  });

  it('no rompe si el producto no estaba en el pedido', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));
    act(() => result.current.removeItem(999));

    expect(result.current.items).toHaveLength(1);
  });
});

describe('updateQuantity', () => {
  it('cambia la cantidad de un producto', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));
    act(() => result.current.updateQuantity(1, 5));

    expect(result.current.items[0].quantity).toBe(5);
  });

  // El carrito guarda una "foto" del stock al agregar el producto, y la usa
  // para topear acá.
  it('topea la cantidad al stock disponible', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(casiAgotado));
    act(() => result.current.updateQuantity(5, 99));

    expect(result.current.items[0].quantity).toBe(2);
  });

  it('saca el producto si la cantidad queda en 0', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));
    act(() => result.current.updateQuantity(1, 0));

    expect(result.current.items).toHaveLength(0);
  });

  it('saca el producto si la cantidad queda en negativo', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));
    act(() => result.current.updateQuantity(1, -3));

    expect(result.current.items).toHaveLength(0);
  });
});

describe('clearOrder', () => {
  it('vacía el pedido entero', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));
    act(() => result.current.addItem(pollo));
    act(() => result.current.clearOrder());

    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });
});

describe('total e itemCount', () => {
  it('arrancan en cero con el carrito vacío', () => {
    const { result } = montarCarrito();

    expect(result.current.total).toBe(0);
    expect(result.current.itemCount).toBe(0);
  });

  it('el total suma precio por cantidad de cada producto', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado)); // 8900 x 1
    act(() => result.current.addItem(asado)); // 8900 x 2 = 17800
    act(() => result.current.addItem(pollo)); // + 4500

    expect(result.current.total).toBe(22300);
  });

  it('el total se recalcula al cambiar una cantidad', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(pollo));
    expect(result.current.total).toBe(4500);

    act(() => result.current.updateQuantity(4, 3));
    expect(result.current.total).toBe(13500);
  });

  // itemCount es cuántas FILAS hay (lo que muestra el globito del navbar),
  // no cuántos kilos.
  it('itemCount cuenta productos distintos, no cantidades', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));
    act(() => result.current.addItem(asado));
    act(() => result.current.addItem(pollo));

    expect(result.current.itemCount).toBe(2);
  });
});

// Antes el carrito guardaba product.price siempre: el cliente veía "-15%" en la
// vidriera y pagaba el precio de lista. Estos tests son los que impiden que
// eso vuelva a pasar.
describe('productos en oferta', () => {
  it('guarda el precio con descuento, no el de lista', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asadoEnOferta));

    expect(result.current.items[0].price).toBe(7565);
  });

  it('el total usa el precio con descuento', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asadoEnOferta));
    act(() => result.current.updateQuantity(1, 2));

    expect(result.current.total).toBe(15130);
  });

  it('un producto sin oferta sigue guardando su precio de lista', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));

    expect(result.current.items[0].price).toBe(8900);
  });

  // El precio se congela al agregar: si el catálogo cambia mientras la persona
  // compra, lo que ya está en el carrito no se toca.
  it('no repisa el precio si el producto vuelve a agregarse más caro', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asadoEnOferta));
    act(() => result.current.addItem({ ...asado, price: 12000 }));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].price).toBe(7565);
    expect(result.current.total).toBe(15130);
  });
});

// Antes el carrito vivía solo en memoria: un F5 en el medio de la compra y la
// persona se quedaba sin nada. Ahora sobrevive, igual que la sesión.
describe('el carrito sobrevive al refresh', () => {
  it('guarda el pedido en localStorage al agregar un producto', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));

    const guardado = leerCarritoGuardado();

    expect(guardado).toHaveLength(1);
    expect(guardado[0]).toMatchObject({ productId: 1, quantity: 1, price: 8900 });
  });

  it('guarda también los cambios de cantidad y las bajas', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));
    act(() => result.current.addItem(pollo));
    act(() => result.current.updateQuantity(1, 3));
    act(() => result.current.removeItem(4));

    const guardado = leerCarritoGuardado();

    expect(guardado).toHaveLength(1);
    expect(guardado[0]).toMatchObject({ productId: 1, quantity: 3 });
  });

  it('arranca con el pedido que había quedado guardado', () => {
    dejarCarritoGuardado([itemGuardado(asado, 2), itemGuardado(pollo, 1)]);

    const { result } = montarCarrito();

    // Ya está puesto en el primer render: no hace falta esperar nada.
    expect(result.current.items).toHaveLength(2);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.total).toBe(22300); // 8900 x2 + 4500
  });

  it('arranca vacío si no hay nada guardado', () => {
    const { result } = montarCarrito();

    expect(result.current.items).toEqual([]);
  });

  // clearOrder se llama cuando la compra salió bien: el pedido ya comprado no
  // tiene que reaparecer la próxima vez que la persona entre.
  it('clearOrder borra el pedido guardado', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));
    expect(leerCarritoGuardado()).not.toBeNull();

    act(() => result.current.clearOrder());

    expect(leerCarritoGuardado()).toBeNull();
  });

  it('vaciar el carrito a mano también lo borra del navegador', () => {
    const { result } = montarCarrito();

    act(() => result.current.addItem(asado));
    act(() => result.current.removeItem(1));

    expect(leerCarritoGuardado()).toBeNull();
  });
});

describe('el carrito guardado puede venir roto', () => {
  it('arranca vacío si lo guardado no es JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'esto no es json');

    const { result } = montarCarrito();

    expect(result.current.items).toEqual([]);
  });

  it('arranca vacío si lo guardado no es una lista', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ productId: 1 }));

    const { result } = montarCarrito();

    expect(result.current.items).toEqual([]);
  });

  // Una fila rota no se lleva puesto el pedido entero.
  it('descarta las filas rotas y conserva las sanas', () => {
    dejarCarritoGuardado([
      itemGuardado(asado, 2),
      null,
      { productId: 99, name: 'Sin precio', quantity: 1 },
      { ...itemGuardado(pollo, 1), quantity: 0 },
    ]);

    const { result } = montarCarrito();

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe(1);
    // Y el total no queda en NaN, que es lo que pasaría con una fila sin precio.
    expect(result.current.total).toBe(17800);
  });
});

// Entre que la persona cargó el carrito y volvió, el catálogo pudo cambiar.
describe('el carrito guardado se revisa contra el catálogo', () => {
  it('saca los productos que ya no están en el catálogo', async () => {
    dejarCarritoGuardado([itemGuardado(asado, 1), itemGuardado(pollo, 1)]);
    // El admin borró el pollo mientras tanto.
    getProducts.mockResolvedValue([asado]);

    const { result } = montarCarrito();

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].productId).toBe(1);
    expect(result.current.total).toBe(8900);
  });

  it('recorta la cantidad al stock que hay hoy', async () => {
    // Guardó 5 kg de chorizo; hoy quedan 2.
    dejarCarritoGuardado([{ ...itemGuardado(casiAgotado, 5), stock: 10 }]);
    getProducts.mockResolvedValue([casiAgotado]);

    const { result } = montarCarrito();

    await waitFor(() => expect(result.current.items[0].quantity).toBe(2));
    // Y la foto del stock queda actualizada, para que el carrito tope bien.
    expect(result.current.items[0].stock).toBe(2);
  });

  it('saca los productos que se quedaron sin stock', async () => {
    dejarCarritoGuardado([itemGuardado(asado, 1), { ...itemGuardado(agotado, 1), stock: 4 }]);
    getProducts.mockResolvedValue([asado, agotado]);

    const { result } = montarCarrito();

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].productId).toBe(1);
  });

  it('no toca el precio congelado en el carrito', async () => {
    // El asado se guardó a 7565 (estaba en oferta) y hoy vale 8900 de lista.
    dejarCarritoGuardado([{ ...itemGuardado(asado, 1), price: 7565 }]);
    getProducts.mockResolvedValue([asado]);

    const { result } = montarCarrito();

    await waitFor(() => expect(result.current.items[0].stock).toBe(25));
    expect(result.current.items[0].price).toBe(7565);
  });

  it('deja el carrito como estaba si el catálogo no responde', async () => {
    dejarCarritoGuardado([itemGuardado(asado, 2)]);
    getProducts.mockRejectedValue(new Error('El servidor no responde'));

    const { result } = montarCarrito();

    // Esperamos a que el pedido fallido termine de procesarse.
    await waitFor(() => expect(getProducts).toHaveBeenCalled());

    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(17800);
  });

  it('no le pide el catálogo al servidor si el carrito está vacío', () => {
    montarCarrito();

    expect(getProducts).not.toHaveBeenCalled();
  });
});
