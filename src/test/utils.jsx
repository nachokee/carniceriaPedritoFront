import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrderProvider, useOrder } from '../context/OrderContext';

// Las pantallas de la app no funcionan solas: necesitan a Mantine para los
// estilos, al Router para los <Link> y al OrderProvider para el carrito. En la
// app de verdad eso lo arman main.jsx y App.jsx.
//
// Esta función hace lo mismo para los tests, así cada test escribe una línea
// (renderWithProviders(<ProductList />)) en vez de repetir los tres providers.
//
// - route: con qué URL arranca la pantalla. Sirve para probar cosas como
//   /catalogo?category=Pollo sin tener que navegar a mano.
//
// MemoryRouter es un router "de mentira" que guarda la URL en memoria en vez
// de en la barra del navegador (que en los tests no existe).
//
// oxlint-disable-next-line react/only-export-components -- este archivo es solo para tests: no lo toca el hot reload
export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[route]}>
        <OrderProvider>{ui}</OrderProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
}

// Componente espía: no se ve en la app, solo existe para los tests.
// Se renderiza al lado de la pantalla que estamos probando y escribe en
// pantalla lo que hay en el carrito, así el test puede leerlo con getByTestId.
//
// Es una forma de comprobar que "Agregar al pedido" guardó lo correcto sin
// tener que espiar la función addItem por dentro: miramos el resultado real.
export function CartProbe() {
  const { items, total, itemCount } = useOrder();

  return (
    <div>
      <span data-testid="cart-count">{itemCount}</span>
      <span data-testid="cart-total">{total}</span>
      <ul data-testid="cart-items">
        {items.map((item) => (
          <li key={item.productId}>
            {item.name} x{item.quantity}
          </li>
        ))}
      </ul>
    </div>
  );
}
