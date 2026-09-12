import { Badge, Card, Container, Select, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconClipboardList } from '@tabler/icons-react';
import { useState } from 'react';
import { getAllOrders, updateOrderStatus } from '../api/orderApi';
import { EmptyState, ScreenError, ScreenLoader } from '../components/ScreenStates';
import { formatCurrency, formatDate } from '../format';
import { ORDER_STATUSES, getStatusColor } from '../orderStatus';
import { useAsync } from '../useAsync';

function AdminOrdersPage() {
  const { data, loading, error, reload } = useAsync(async () => {
    const orders = await getAllOrders();

    // Más recientes primero.
    return [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, []);

  const orders = data ?? [];

  // Guarda el orderId que se está actualizando, para deshabilitar ese Select
  // mientras viaja el cambio (y no el de todas las filas).
  const [updatingId, setUpdatingId] = useState(null);

  const handleStatusChange = async (orderId, status) => {
    setUpdatingId(orderId);

    try {
      await updateOrderStatus(orderId, status);

      notifications.show({
        message: `Pedido #${orderId}: ${status}`,
        color: 'green',
      });

      // reload() vuelve a pedir la lista para mostrar el estado ya guardado.
      reload();
    } catch (requestError) {
      notifications.show({
        title: 'No se pudo cambiar el estado',
        message: requestError.message,
        color: 'red',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <ScreenLoader label="Cargando pedidos…" />;
  }

  if (error) {
    return (
      <ScreenError
        title="No pudimos traer los pedidos"
        message={error}
        onRetry={reload}
        backTo="/admin/products"
        backLabel="Ir a productos"
      />
    );
  }

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="lg">
        Pedidos
      </Title>

      {orders.length === 0 ? (
        <EmptyState
          icon={<IconClipboardList size={56} />}
          title="No hay pedidos"
          message="Cuando algún cliente compre, el pedido aparece acá."
        />
      ) : (
        <Card shadow="sm" padding={{ base: 'sm', sm: 'lg' }} radius="md" withBorder>
          <Table.ScrollContainer minWidth={700}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th ta="right">Total</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Cambiar a</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {orders.map((order) => (
                  <Table.Tr key={order.orderId}>
                    <Table.Td>
                      <Text fw={700}>{order.customerName}</Text>
                      <Text size="xs" c="dimmed">
                        #{order.orderId}
                      </Text>
                    </Table.Td>

                    <Table.Td>{formatDate(order.date)}</Table.Td>

                    <Table.Td ta="right">
                      <Text fw={700}>{formatCurrency(order.total)}</Text>
                    </Table.Td>

                    <Table.Td>
                      <Badge
                        color={getStatusColor(order.status)}
                        variant="light"
                        tt="capitalize"
                      >
                        {order.status}
                      </Badge>
                    </Table.Td>

                    <Table.Td>
                      <Select
                        data={ORDER_STATUSES}
                        value={order.status}
                        onChange={(value) => handleStatusChange(order.orderId, value)}
                        disabled={updatingId === order.orderId}
                        allowDeselect={false}
                        w={180}
                        aria-label={`Estado del pedido ${order.orderId}`}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
    </Container>
  );
}

export default AdminOrdersPage;
