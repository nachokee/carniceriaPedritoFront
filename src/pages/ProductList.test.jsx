import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProbe, renderWithProviders } from '../test/utils';
import ProductList from './ProductList';

// vi.mock reemplaza el módulo entero por uno falso. Así el test no depende de
// los productos del mock de verdad (que pueden cambiar) ni de sus demoras:
// controlamos exactamente qué devuelve getProducts().
//
// Ojo: la ruta tiene que ser igual a la que usa ProductList en su import.
vi.mock('../api/catalogApi', () => ({
  getProducts: vi.fn(),
}));

// Lo importamos DESPUÉS del vi.mock para quedarnos con la versión falsa.
import { getProducts } from '../api/catalogApi';

// Cuatro productos, de tres categorías distintas y uno agotado: alcanza para
// probar el buscador, el filtro y el botón de agregar.
const productosDePrueba = [
  { id: 1, name: 'Asado de tira', price: 8900, unit: 'kg', stock: 25, category: 'Vacuno' },
  { id: 2, name: 'Bife de chorizo', price: 11200, unit: 'kg', stock: 8, category: 'Vacuno' },
  { id: 4, name: 'Pollo entero', price: 4500, unit: 'kg', stock: 30, category: 'Pollo' },
  { id: 6, name: 'Milanesas', price: 10400, unit: 'kg', stock: 0, category: 'Vacuno' },
];

beforeEach(() => {
  // mockResolvedValue: "cuando alguien llame a getProducts(), devolvé esta
  // lista". Se vuelve a configurar en cada test para que ninguno herede
  // lo que hizo el anterior.
  getProducts.mockResolvedValue(productosDePrueba);
});

// La pantalla arranca en "cargando" y recién después muestra los productos.
// Este helper espera a que aparezca el primero, así cada test no repite la espera.
async function renderYEsperar(route = '/catalogo') {
  const utils = renderWithProviders(
    <>
      <ProductList />
      <CartProbe />
    </>,
    { route },
  );

  await screen.findByText('Asado de tira');

  return utils;
}

describe('ProductList: mostrar productos', () => {
  it('muestra los productos que devuelve getProducts()', async () => {
    await renderYEsperar();

    expect(screen.getByText('Asado de tira')).toBeInTheDocument();
    expect(screen.getByText('Bife de chorizo')).toBeInTheDocument();
    expect(screen.getByText('Pollo entero')).toBeInTheDocument();
    expect(screen.getByText('Milanesas')).toBeInTheDocument();
  });

  it('muestra el precio y la unidad de cada producto', async () => {
    await renderYEsperar();

    // Buscamos por expresión regular y no por texto exacto porque Intl mete un
    // espacio "duro" entre el $ y el número: "$ 8.900" no matchearía.
    expect(screen.getByText(/8\.900.*kg/)).toBeInTheDocument();
  });

  it('muestra la categoría de cada producto como badge', async () => {
    await renderYEsperar();

    // Buscamos el badge DENTRO de la tarjeta del producto. Si buscáramos
    // "Vacuno" en toda la pantalla encontraríamos también la opción del
    // desplegable de categorías, que Mantine deja en el DOM aunque esté cerrado.
    const tarjetaDelAsado = screen.getByText('Asado de tira').closest('.mantine-Card-root');
    const tarjetaDelPollo = screen.getByText('Pollo entero').closest('.mantine-Card-root');

    expect(within(tarjetaDelAsado).getByText('Vacuno')).toBeInTheDocument();
    expect(within(tarjetaDelPollo).getByText('Pollo')).toBeInTheDocument();
  });

  it('deshabilita el botón de un producto agotado', async () => {
    await renderYEsperar();

    expect(screen.getByRole('button', { name: 'Sin stock' })).toBeDisabled();
  });
});

describe('ProductList: buscador', () => {
  it('filtra los productos por nombre mientras se escribe', async () => {
    const user = userEvent.setup();
    await renderYEsperar();

    await user.type(screen.getByLabelText('Buscar'), 'pollo');

    expect(screen.getByText('Pollo entero')).toBeInTheDocument();
    // Los que no coinciden desaparecen de la pantalla.
    expect(screen.queryByText('Asado de tira')).not.toBeInTheDocument();
    expect(screen.queryByText('Bife de chorizo')).not.toBeInTheDocument();
  });

  // Escribimos en minúscula algo que en el catálogo está en mayúscula.
  it('no distingue mayúsculas de minúsculas', async () => {
    const user = userEvent.setup();
    await renderYEsperar();

    await user.type(screen.getByLabelText('Buscar'), 'ASADO');

    expect(screen.getByText('Asado de tira')).toBeInTheDocument();
  });

  it('encuentra por una parte del nombre, no solo por el principio', async () => {
    const user = userEvent.setup();
    await renderYEsperar();

    await user.type(screen.getByLabelText('Buscar'), 'chorizo');

    expect(screen.getByText('Bife de chorizo')).toBeInTheDocument();
    expect(screen.queryByText('Pollo entero')).not.toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no encuentra nada', async () => {
    const user = userEvent.setup();
    await renderYEsperar();

    await user.type(screen.getByLabelText('Buscar'), 'cordero');

    expect(screen.getByText('No se encontraron productos')).toBeInTheDocument();
  });

  it('la X del buscador vuelve a mostrar todos los productos', async () => {
    const user = userEvent.setup();
    await renderYEsperar();

    await user.type(screen.getByLabelText('Buscar'), 'pollo');
    expect(screen.queryByText('Asado de tira')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Limpiar búsqueda'));

    expect(screen.getByText('Asado de tira')).toBeInTheDocument();
  });
});

describe('ProductList: filtro por categoría', () => {
  // La categoría vive en la URL, así que empezar en esa URL es lo mismo que
  // llegar desde una tarjeta de la pantalla de inicio.
  it('filtra por la categoría que viene en la URL', async () => {
    renderWithProviders(<ProductList />, { route: '/catalogo?category=Pollo' });

    await screen.findByText('Pollo entero');

    expect(screen.queryByText('Asado de tira')).not.toBeInTheDocument();
    expect(screen.queryByText('Bife de chorizo')).not.toBeInTheDocument();
  });

  it('ignora una categoría inválida y muestra todo', async () => {
    renderWithProviders(<ProductList />, { route: '/catalogo?category=Pescado' });

    // Si no la ignorara, la lista quedaría vacía.
    await screen.findByText('Asado de tira');
    expect(screen.getByText('Pollo entero')).toBeInTheDocument();
  });

  it('cambia el filtro desde el Select', async () => {
    const user = userEvent.setup();
    await renderYEsperar();

    // Abrimos el desplegable y elegimos "Pollo".
    // Buscamos por rol (combobox) y no por label: el Select de Mantine tiene
    // además un input escondido con el mismo label, y getByLabelText no sabría
    // cuál de los dos queremos.
    const desplegable = screen.getByRole('combobox', { name: 'Categoría' });
    await user.click(desplegable);

    // Se abrió de verdad (así lo lee un lector de pantalla).
    expect(desplegable).toHaveAttribute('aria-expanded', 'true');

    // hidden: true es necesario acá. En los tests no se cargan los estilos de
    // Mantine, y sin CSS jsdom cree que la lista desplegada sigue oculta. Las
    // opciones están en la pantalla y se pueden clickear igual.
    await user.click(await screen.findByRole('option', { name: 'Pollo', hidden: true }));

    await waitFor(() => {
      expect(screen.queryByText('Asado de tira')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Pollo entero')).toBeInTheDocument();
  });

  it('el buscador y el filtro se combinan', async () => {
    const user = userEvent.setup();
    // Ya filtrado por Vacuno, buscamos "bife": tiene que quedar uno solo.
    renderWithProviders(<ProductList />, { route: '/catalogo?category=Vacuno' });
    await screen.findByText('Asado de tira');

    await user.type(screen.getByLabelText('Buscar'), 'bife');

    expect(screen.getByText('Bife de chorizo')).toBeInTheDocument();
    expect(screen.queryByText('Asado de tira')).not.toBeInTheDocument();
    // "Pollo entero" tampoco, aunque no lo filtre el nombre: lo filtra la categoría.
    expect(screen.queryByText('Pollo entero')).not.toBeInTheDocument();
  });
});

describe('ProductList: agregar al pedido', () => {
  it('agrega el producto correcto al carrito', async () => {
    const user = userEvent.setup();
    await renderYEsperar();

    // El aria-label del botón no distingue una tarjeta de otra, así que
    // primero ubicamos la tarjeta del Pollo y después el botón de adentro.
    const tarjetaDelPollo = screen.getByText('Pollo entero').closest('.mantine-Card-root');

    await user.click(
      within(tarjetaDelPollo).getByRole('button', { name: 'Agregar al pedido' }),
    );

    // CartProbe escribe lo que hay en el carrito: si dice "Pollo entero x1",
    // addItem recibió el producto correcto.
    expect(screen.getByTestId('cart-items')).toHaveTextContent('Pollo entero x1');
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
    expect(screen.getByTestId('cart-total')).toHaveTextContent('4500');
  });

  it('agregar dos veces el mismo producto suma la cantidad', async () => {
    const user = userEvent.setup();
    await renderYEsperar();

    const tarjeta = screen.getByText('Pollo entero').closest('.mantine-Card-root');
    const boton = within(tarjeta).getByRole('button', { name: 'Agregar al pedido' });

    await user.click(boton);
    await user.click(boton);

    expect(screen.getByTestId('cart-items')).toHaveTextContent('Pollo entero x2');
    // Sigue siendo UNA fila en el carrito.
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
    expect(screen.getByTestId('cart-total')).toHaveTextContent('9000');
  });
});

describe('ProductList: estados de carga y error', () => {
  it('muestra el cargando mientras espera los productos', () => {
    renderWithProviders(<ProductList />);

    expect(screen.getByText('Cargando productos…')).toBeInTheDocument();
  });

  it('muestra el error si getProducts() falla', async () => {
    getProducts.mockRejectedValue(new Error('El servidor no responde'));

    renderWithProviders(<ProductList />);

    expect(
      await screen.findByText('No pudimos cargar los productos'),
    ).toBeInTheDocument();
    expect(screen.getByText('El servidor no responde')).toBeInTheDocument();
  });

  it('muestra el estado vacío si no hay ningún producto', async () => {
    getProducts.mockResolvedValue([]);

    renderWithProviders(<ProductList />);

    expect(await screen.findByText('No hay productos')).toBeInTheDocument();
  });
});
