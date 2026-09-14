import {
  Badge,
  Button,
  Card,
  CloseButton,
  Container,
  Grid,
  Group,
  Select,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMeatOff, IconSearch, IconSearchOff } from '@tabler/icons-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from '../api/catalogApi';
import {
  ALL_CATEGORIES,
  CATEGORIES,
  CATEGORY_FILTER_OPTIONS,
  DEFAULT_CATEGORY,
  getCategoryColor,
} from '../categories';
import { EmptyState, ScreenError, ScreenLoader } from '../components/ScreenStates';
import { useOrder } from '../context/OrderContext';
import { formatCurrency } from '../format';
import { useAsync } from '../useAsync';

function ProductList() {
  // addItem y items salen del OrderContext: no hace falta recibirlos por props.
  // Necesitamos items para saber cuánto de cada producto ya está en el carrito.
  const { items: cartItems, addItem } = useOrder();

  // useAsync se encarga del ciclo cargando → dato o error.
  // El [] final significa "pedilo una sola vez, al entrar a la pantalla".
  const { data, loading, error, reload } = useAsync(() => getProducts(), []);

  // Mientras carga, data es null: el ?? [] evita romper al mapear.
  const products = data ?? [];

  // --- Filtros de la pantalla ---
  // Ninguno viaja al backend: filtran la lista que ya tenemos en memoria.

  // El buscador es estado local común: se escribe y se borra en esta pantalla.
  const [search, setSearch] = useState('');

  // La categoría, en cambio, vive en la URL (/catalogo?category=Vacuno).
  // Así las tarjetas de categoría de la pantalla de inicio pueden linkear
  // directo a una categoría, y el link se puede compartir o guardar.
  const [searchParams, setSearchParams] = useSearchParams();

  // Si la URL trae una categoría que no existe (alguien la escribió a mano, o
  // quedó vieja), la ignoramos y mostramos todo en vez de una lista vacía.
  const categoryFromUrl = searchParams.get('category');
  const category = CATEGORIES.includes(categoryFromUrl)
    ? categoryFromUrl
    : ALL_CATEGORIES;

  // Cambiar el Select reescribe la URL, y eso vuelve a renderizar la pantalla.
  // replace: true → cada cambio de filtro NO deja una entrada nueva en el
  // historial (si no, el botón "atrás" tendría que deshacer filtro por filtro).
  const setCategory = (value) => {
    if (!value || value === ALL_CATEGORIES) {
      // "Todas" = sin filtro: sacamos el parámetro y la URL queda limpia.
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ category: value }, { replace: true });
    }
  };

  // Filtramos sobre el array que YA trajo getProducts(), sin pedir nada nuevo.
  // Con un puñado de productos esto es instantáneo.
  //
  // A futuro, cuando catalog-service sea real y el catálogo crezca (cientos de
  // productos), esto conviene moverlo al backend: getProducts({ search,
  // category, page }) y que el servidor devuelva solo la página que se ve.
  // Ver MIGRATION.md, sección 4.
  const filteredProducts = products.filter((product) => {
    // toLowerCase en los dos lados: así "asado" encuentra "Asado de tira".
    // trim() saca los espacios de más que quedan al tipear.
    // String(... ?? '') es un seguro: si el backend real mandara un producto
    // sin name, sin esto el .toLowerCase() rompería toda la pantalla.
    const coincideNombre = String(product.name ?? '')
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    // Si el filtro está en "Todas", este chequeo pasa siempre.
    const coincideCategoria =
      category === ALL_CATEGORIES || product.category === category;

    // && : el producto se muestra solo si cumple las DOS condiciones, así los
    // dos filtros se combinan.
    return coincideNombre && coincideCategoria;
  });

  const handleAdd = (product) => {
    // Cuánto de este producto ya hay en el carrito.
    const yaEnCarrito =
      cartItems.find((item) => item.productId === product.id)?.quantity ?? 0;

    // No dejamos agregar más de lo que hay en stock.
    if (typeof product.stock === 'number' && yaEnCarrito + 1 > product.stock) {
      notifications.show({
        title: 'No hay más stock',
        message:
          'Ya tenés ' + yaEnCarrito + ' ' + product.unit + ' de ' + product.name +
          ' en el pedido, y es todo lo que queda.',
        color: 'yellow',
      });
      return;
    }

    addItem(product);

    // Aviso corto para que se note que el clic hizo algo.
    notifications.show({
      message: `${product.name} agregado al pedido`,
      color: 'green',
      autoClose: 1500,
    });
  };

  if (loading) {
    return <ScreenLoader label="Cargando productos…" />;
  }

  if (error) {
    return (
      <ScreenError
        title="No pudimos cargar los productos"
        message={error}
        onRetry={reload}
        backTo="/pedido"
        backLabel="Ver mi pedido"
      />
    );
  }

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="lg">
        Productos
      </Title>

      {/* La barra de filtros solo tiene sentido si hay algo que filtrar. */}
      {products.length > 0 && (
        // grow: los dos controles se reparten el ancho. wrap="wrap": en celular
        // el Select baja abajo del buscador en vez de apretarse.
        <Group mb="lg" grow wrap="wrap" align="flex-end">
          <TextInput
            label="Buscar"
            placeholder="Buscar por nombre…"
            leftSection={<IconSearch size={16} />}
            // La X para limpiar aparece solo cuando hay algo escrito.
            rightSection={
              search !== '' ? (
                <CloseButton
                  size="sm"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setSearch('')}
                />
              ) : null
            }
            value={search}
            // Cada tecla actualiza el estado → React redibuja → la lista de
            // arriba se vuelve a filtrar. Eso es el "filtra mientras escribís".
            onChange={(event) => setSearch(event.currentTarget.value)}
          />

          {/* Usamos Select y no SegmentedControl porque son seis opciones: en
              un celular un SegmentedControl quedaría ilegible. */}
          <Select
            label="Categoría"
            data={CATEGORY_FILTER_OPTIONS}
            allowDeselect={false}
            value={category}
            onChange={setCategory}
          />
        </Group>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon={<IconMeatOff size={56} />}
          title="No hay productos"
          message="Todavía no cargamos el catálogo. Volvé en un rato."
        />
      ) : filteredProducts.length === 0 ? (
        // Hay productos, pero ninguno pasa los filtros. Es importante que este
        // mensaje sea distinto al de arriba: no es lo mismo "no hay catálogo"
        // que "no encontré lo que buscás".
        <EmptyState
          icon={<IconSearchOff size={56} />}
          title="No se encontraron productos"
          message="Probá con otro nombre o cambiá la categoría."
        />
      ) : (
        <Grid>
          {filteredProducts.map((product) => {
            // stock undefined = el backend no controla stock, no bloqueamos nada.
            const sinStock = product.stock === 0;

            return (
              // span cambia según el ancho: 1 columna en celular (base), 2 a
              // partir de 576px (xs), 3 en escritorio (md).
              <Grid.Col key={product.id} span={{ base: 12, xs: 6, md: 4 }}>
                {/* La tarjeta agotada se ve apagada (opacity) para que se note
                    de un vistazo cuál no se puede comprar. */}
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  h="100%"
                  style={{ opacity: sinStock ? 0.55 : 1 }}
                >
                  {/* Badge de categoría arriba del nombre: se ve de un vistazo
                      qué tipo de corte es. El color sale de getCategoryColor. */}
                  <Badge
                    color={getCategoryColor(product.category)}
                    variant="light"
                    size="sm"
                    mb="xs"
                    w="fit-content"
                  >
                    {product.category ?? DEFAULT_CATEGORY}
                  </Badge>

                  <Text fw={700} size="lg">
                    {product.name}
                  </Text>

                  <Text c="dimmed" mt={4}>
                    {formatCurrency(product.price)} / {product.unit}
                  </Text>

                  {typeof product.stock === 'number' &&
                    (sinStock ? (
                      <Badge color="red" variant="light" mt="xs">
                        Agotado
                      </Badge>
                    ) : (
                      <Text size="sm" c="dimmed" mt="xs">
                        Stock: {product.stock} {product.unit}
                      </Text>
                    ))}

                  {/* mt="auto" empuja el botón al fondo: con h="100%" en la Card,
                      todas las tarjetas de la fila quedan parejas. */}
                  <Button
                    fullWidth
                    mt="auto"
                    disabled={sinStock}
                    onClick={() => handleAdd(product)}
                  >
                    {sinStock ? 'Sin stock' : 'Agregar al pedido'}
                  </Button>
                </Card>
              </Grid.Col>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}

export default ProductList;
