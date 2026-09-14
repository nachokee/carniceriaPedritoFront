import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderProvider, useOrder } from './OrderContext';

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
