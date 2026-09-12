import { Button, Card, Container, Group, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Link, useNavigate } from 'react-router-dom';
import OrderItemsList from '../components/OrderItemsList';
import { useOrder } from '../context/OrderContext';

function OrderSummary() {
  const { items, total, updateQuantity, removeItem } = useOrder();
  const navigate = useNavigate();

  // Se llama cada vez que se toca la cantidad de una fila.
  const handleQuantityChange = (item, quantity) => {
    if (typeof item.stock === 'number' && quantity > item.stock) {
      notifications.show({
        title: 'No hay más stock',
        message: 'Solo quedan ' + item.stock + ' ' + item.unit + ' de ' + item.name,
        color: 'yellow',
      });

      // Lo dejamos en el máximo disponible en vez de ignorar el cambio.
      updateQuantity(item.productId, item.stock);
      return;
    }

    updateQuantity(item.productId, quantity);
  };

  // Carrito vacío.
  if (items.length === 0) {
    return (
      <Container size="sm" py="xl">
        <Title order={2} mb="md">
          Mi pedido
        </Title>

        <Text c="dimmed">Todavía no agregaste productos.</Text>

        <Button component={Link} to="/" mt="md">
          Ver productos
        </Button>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="lg">
        Mi pedido
      </Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        {/* editable: acá sí se pueden cambiar cantidades y borrar productos */}
        <OrderItemsList
          items={items}
          editable
          onQuantityChange={handleQuantityChange}
          onRemove={removeItem}
        />
      </Card>

      <Group justify="space-between" mt="lg">
        <Stack gap={0}>
          <Text c="dimmed" size="sm">
            Total
          </Text>
          <Text fw={700} size="xl">
            ${total}
          </Text>
        </Stack>

        {/* El pedido ya no se envía desde acá: eso pasa en el checkout,
            junto con el pago. */}
        <Button size="md" onClick={() => navigate('/checkout')}>
          Confirmar pedido
        </Button>
      </Group>
    </Container>
  );
}

export default OrderSummary;
