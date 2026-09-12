import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Loader,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconFileInvoice } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrdersByUser } from '../api/orderApi';
import { useAuth } from '../context/AuthContext';
import { getStatusColor } from '../orderStatus';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('es-AR', { dateStyle: 'medium' });

function OrderHistoryPage() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const data = await getOrdersByUser(user.id);

        // [...data] hace una copia antes de ordenar, porque sort() modifica el
        // array original. Restar dos fechas da los milisegundos de diferencia:
        // b - a deja el más reciente primero.
        const sorted = [...data].sort(
          (a, b) => new Date(b.date) - new Date(a.date),
        );

        if (!cancelled) setOrders(sorted);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [user.id]);

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
        <Alert color="red" icon={<IconAlertCircle size={18} />} title="No pudimos traer tus pedidos">
          {error}
        </Alert>
      </Container>
    );
  }

  // Todavía no compró nada.
  if (orders.length === 0) {
    return (
      <Container size="sm" py="xl">
        <Title order={2} mb="md">
          Mis pedidos
        </Title>

        <Text c="dimmed">Todavía no hiciste ningún pedido.</Text>

        <Button component={Link} to="/" mt="md">
          Ver productos
        </Button>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="lg">
        Mis pedidos
      </Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Table.ScrollContainer minWidth={500}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fecha</Table.Th>
                <Table.Th ta="right">Total</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {orders.map((order) => (
                <Table.Tr key={order.orderId}>
                  <Table.Td>{formatDate(order.date)}</Table.Td>

                  <Table.Td ta="right">
                    <Text fw={700}>${order.total}</Text>
                  </Table.Td>

                  <Table.Td>
                    {/* tt="capitalize" muestra "pagado" como "Pagado" */}
                    <Badge
                      color={getStatusColor(order.status)}
                      variant="light"
                      tt="capitalize"
                    >
                      {order.status}
                    </Badge>
                  </Table.Td>

                  <Table.Td ta="right">
                    {/* Le pasamos los items por el state porque la factura
                        mockeada los necesita para armarse. */}
                    <Button
                      component={Link}
                      to={`/invoice/${order.orderId}`}
                      state={{ items: order.items }}
                      variant="light"
                      size="xs"
                      leftSection={<IconFileInvoice size={16} />}
                    >
                      Ver factura
                    </Button>
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

export default OrderHistoryPage;
