import { Button, Card, Container, Group, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconShoppingCartOff } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import OrderItemsList from '../components/OrderItemsList';
import { EmptyState } from '../components/ScreenStates';
import { useOrder } from '../context/OrderContext';
import { formatCurrency } from '../format';

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

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="lg">
        Mi pedido
      </Title>

      {items.length === 0 ? (
        <EmptyState
          icon={<IconShoppingCartOff size={56} />}
          title="Tu carrito está vacío"
          message="Agregá productos del catálogo para poder hacer el pedido."
          actionTo="/"
          actionLabel="Ver productos"
        />
      ) : (
        <>
          <Card shadow="sm" padding={{ base: 'sm', sm: 'lg' }} radius="md" withBorder>
            {/* editable: acá sí se pueden cambiar cantidades y borrar productos */}
            <OrderItemsList
              items={items}
              editable
              onQuantityChange={handleQuantityChange}
              onRemove={removeItem}
            />
          </Card>

          {/* En celular el total y el botón se apilan (wrap) */}
          <Group justify="space-between" mt="lg" wrap="wrap">
            <Stack gap={0}>
              <Text c="dimmed" size="sm">
                Total
              </Text>
              <Text fw={700} size="xl">
                {formatCurrency(total)}
              </Text>
            </Stack>

            {/* El pedido ya no se envía desde acá: eso pasa en el checkout,
                junto con el pago. */}
            <Button
              size="md"
              onClick={() => navigate('/checkout')}
              w={{ base: '100%', xs: 'auto' }}
            >
              Confirmar pedido
            </Button>
          </Group>
        </>
      )}
    </Container>
  );
}

export default OrderSummary;
