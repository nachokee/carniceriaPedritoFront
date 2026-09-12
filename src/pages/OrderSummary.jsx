import { Button, Card, Container, Group, Stack, Text, Title } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import OrderItemsList from '../components/OrderItemsList';
import { useOrder } from '../context/OrderContext';

function OrderSummary() {
  const { items, total, updateQuantity, removeItem } = useOrder();
  const navigate = useNavigate();

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
          onQuantityChange={updateQuantity}
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
