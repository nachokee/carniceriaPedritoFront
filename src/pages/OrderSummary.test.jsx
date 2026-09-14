import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { useOrder } from '../context/OrderContext';
import { renderWithProviders } from '../test/utils';
import OrderSummary from './OrderSummary';

// OrderSummary lee el carrito del contexto, así que para probarlo hay que
// llenar el carrito primero. Este componente lo hace: apenas se monta, agrega
// los productos que le pasemos. No dibuja nada.
//
// Es más realista que inventar un contexto falso: usamos el OrderProvider de
// verdad, el mismo que usa la app.
//
// El useRef es importante: sin él, cuando un test vacía el carrito este
// componente lo volvería a llenar y el test nunca vería el carrito vacío.
// Con la bandera, llena una sola vez y nunca más.
function LlenarCarrito({ productos }) {
  const { addItem } = useOrder();
  const yaLlenado = useRef(false);

  useEffect(() => {
    if (yaLlenado.current) {
      return;
    }

    yaLlenado.current = true;
    productos.forEach(addItem);
    // Las dependencias quedan vacías a propósito: esto corre una sola vez.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

const asado = { id: 1, name: 'Asado de tira', price: 8900, unit: 'kg', stock: 25 };
const pollo = { id: 4, name: 'Pollo entero', price: 4500, unit: 'kg', stock: 30 };

function renderConCarrito(productos) {
  return renderWithProviders(
    <>
      <LlenarCarrito productos={productos} />
      <OrderSummary />
    </>,
  );
}

describe('OrderSummary: carrito con productos', () => {
  it('muestra los productos del carrito', () => {
    renderConCarrito([asado, pollo]);

    expect(screen.getByText('Asado de tira')).toBeInTheDocument();
    expect(screen.getByText('Pollo entero')).toBeInTheDocument();
  });

  it('muestra el subtotal de cada fila', () => {
    renderConCarrito([asado, pollo]);

    // Buscamos con expresión regular porque Intl mete un espacio "duro"
    // entre el $ y el número.
    expect(screen.getAllByText(/8\.900/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4\.500/).length).toBeGreaterThan(0);
  });

  it('muestra el total correcto', () => {
    renderConCarrito([asado, pollo]);

    // 8900 + 4500 = 13400. Aparece dos veces: en el pie de la tabla y en el
    // bloque "Total" de abajo, al lado del botón.
    expect(screen.getAllByText(/13\.400/).length).toBeGreaterThan(0);
  });

  it('el total tiene en cuenta las cantidades, no solo los precios', () => {
    // Agregamos el asado dos veces: 8900 x 2 = 17800, más 4500 = 22300.
    renderConCarrito([asado, asado, pollo]);

    expect(screen.getAllByText(/22\.300/).length).toBeGreaterThan(0);
  });

  it('muestra el botón para confirmar el pedido', () => {
    renderConCarrito([asado]);

    expect(
      screen.getByRole('button', { name: 'Confirmar pedido' }),
    ).toBeInTheDocument();
  });
});

describe('OrderSummary: quitar productos', () => {
  it('quitar un producto lo saca de la lista', async () => {
    const user = userEvent.setup();
    renderConCarrito([asado, pollo]);

    // Cada tacho de basura tiene su propio aria-label, así no hay dudas de
    // cuál estamos apretando.
    await user.click(screen.getByLabelText('Quitar Asado de tira'));

    expect(screen.queryByText('Asado de tira')).not.toBeInTheDocument();
    // El otro producto sigue ahí.
    expect(screen.getByText('Pollo entero')).toBeInTheDocument();
  });

  it('quitar un producto actualiza el total', async () => {
    const user = userEvent.setup();
    renderConCarrito([asado, pollo]);

    // Antes: 13400.
    expect(screen.getAllByText(/13\.400/).length).toBeGreaterThan(0);

    await user.click(screen.getByLabelText('Quitar Asado de tira'));

    // Después: solo queda el pollo.
    expect(screen.queryByText(/13\.400/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/4\.500/).length).toBeGreaterThan(0);
  });

  it('quitar el último producto deja el carrito vacío', async () => {
    const user = userEvent.setup();
    renderConCarrito([asado]);

    await user.click(screen.getByLabelText('Quitar Asado de tira'));

    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
  });
});

describe('OrderSummary: cambiar cantidades', () => {
  it('subir la cantidad actualiza el subtotal y el total', async () => {
    const user = userEvent.setup();
    renderConCarrito([pollo]);

    const cantidad = screen.getByLabelText('Cantidad de Pollo entero');

    // El triple clic selecciona lo que hay escrito (igual que en un navegador
    // de verdad) y lo que tecleamos después lo reemplaza, todo de una.
    // Si en cambio borráramos primero, el campo quedaría vacío por un instante,
    // y un campo vacío vale 0: el producto se saldría solo del pedido.
    await user.tripleClick(cantidad);
    await user.keyboard('3');

    // 4500 x 3 = 13500.
    expect(screen.getAllByText(/13\.500/).length).toBeGreaterThan(0);
  });

  it('bajar la cantidad a 0 saca el producto del pedido', async () => {
    const user = userEvent.setup();
    renderConCarrito([pollo]);

    const cantidad = screen.getByLabelText('Cantidad de Pollo entero');

    await user.tripleClick(cantidad);
    await user.keyboard('0');

    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
  });
});

describe('OrderSummary: carrito vacío', () => {
  it('muestra el estado vacío y el link al catálogo', () => {
    renderConCarrito([]);

    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver productos' })).toHaveAttribute(
      'href',
      '/catalogo',
    );
  });

  it('no muestra el botón de confirmar si no hay nada', () => {
    renderConCarrito([]);

    expect(
      screen.queryByRole('button', { name: 'Confirmar pedido' }),
    ).not.toBeInTheDocument();
  });
});
