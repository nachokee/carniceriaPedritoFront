import {
  Alert,
  Badge,
  Card,
  Center,
  Container,
  Loader,
  Select,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStatus } from '../api/orderApi';
import { ORDER_STATUSES, getStatusColor } from '../orderStatus';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('es-AR', { dateStyle: 'medium' });

function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Guarda el orderId que se está actualizando, para deshabilitar ese Select
  // mientras viaja el cambio (y no el de todas las filas).
  const [updatingId, setUpdatingId] = useState(null);

  async function loadOrders() {
    try {
      const data = await getAllOrders();

      // Más recientes primero.
      setOrders([...data].sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- loadOrders es async: el setState corre después del await, no en el render
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, status) => {
    setUpdatingId(orderId);

    try {
      await updateOrderStatus(orderId, status);
      notifications.show({ message: `Pedido #${orderId}: ${status}`, color: 'green' });
      await loadOrders();
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
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Container size="sm" py="xl">
        <Alert color="red" icon={<IconAlertCircle size={18} />} title="No pudimos traer los pedidos">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="lg">
        Pedidos
      </Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
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
                    <Text fw={700}>${order.total}</Text>
                  </Table.Td>

                  <Table.Td>
                    <Badge color={getStatusColor(order.status)} variant="light" tt="capitalize">
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
    </Container>
  );
}

export default AdminOrdersPage;
