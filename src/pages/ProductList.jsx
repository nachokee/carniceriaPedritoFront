import {
  Badge,
  Button,
  Card,
  Center,
  Container,
  Grid,
  Loader,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { getProducts } from '../api/catalogApi';
import { useOrder } from '../context/OrderContext';

function ProductList() {
  // addItem y items salen del OrderContext: no hace falta recibirlos por props.
  // Necesitamos items para saber cuánto de cada producto ya está en el carrito.
  const { items: cartItems, addItem } = useOrder();

  // products: lo que muestra la pantalla. loading: true hasta que llega la respuesta.
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // El array vacío como segundo argumento hace que esto corra una sola vez,
  // cuando el componente se monta (y no en cada re-render).
  useEffect(() => {
    async function loadProducts() {
      const data = await getProducts();
      setProducts(data);
      setLoading(false);
    }

    loadProducts();
  }, []);

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
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="lg">
        Productos
      </Title>

      {products.length === 0 ? (
        <Text c="dimmed">No hay productos disponibles.</Text>
      ) : (
        <Grid>
          {products.map((product) => {
            // stock undefined = el backend no controla stock, no bloqueamos nada.
            const sinStock = product.stock === 0;

            return (
            // span cambia según el ancho de pantalla: 1 columna en celular,
            // 2 en tablet y 3 en escritorio (la grilla de Mantine tiene 12 columnas).
              <Grid.Col key={product.id} span={{ base: 12, sm: 6, md: 4 }}>
                {/* La tarjeta agotada se ve apagada (opacity) para que se note
                    de un vistazo cuál no se puede comprar. */}
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  style={{ opacity: sinStock ? 0.55 : 1 }}
                >
                  <Text fw={700} size="lg">
                    {product.name}
                  </Text>

                  <Text c="dimmed" mt={4}>
                    ${product.price} / {product.unit}
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

                  <Button
                    fullWidth
                    mt="md"
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
