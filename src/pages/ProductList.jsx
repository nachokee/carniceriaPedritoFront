import { Button, Card, Center, Container, Grid, Loader, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { getProducts } from '../api/catalogApi';
import { useOrder } from '../context/OrderContext';

function ProductList() {
  // addItem sale del OrderContext: no hace falta recibirlo por props.
  const { addItem } = useOrder();

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
          {products.map((product) => (
            // span cambia según el ancho de pantalla: 1 columna en celular,
            // 2 en tablet y 3 en escritorio (la grilla de Mantine tiene 12 columnas).
            <Grid.Col key={product.id} span={{ base: 12, sm: 6, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Text fw={700} size="lg">
                  {product.name}
                </Text>

                <Text c="dimmed" mt={4}>
                  ${product.price} / {product.unit}
                </Text>

                <Button fullWidth mt="md" onClick={() => handleAdd(product)}>
                  Agregar al pedido
                </Button>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default ProductList;
