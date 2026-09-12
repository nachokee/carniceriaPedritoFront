import { Badge, Button, Card, Container, Grid, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMeatOff } from '@tabler/icons-react';
import { getProducts } from '../api/catalogApi';
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

      {products.length === 0 ? (
        <EmptyState
          icon={<IconMeatOff size={56} />}
          title="No hay productos"
          message="Todavía no cargamos el catálogo. Volvé en un rato."
        />
      ) : (
        <Grid>
          {products.map((product) => {
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
