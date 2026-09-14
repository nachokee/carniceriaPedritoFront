import { Badge, Button, Card, Container, Table, Text, Title } from '@mantine/core';
import { IconPackage } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { getOrdersByUser } from '../api/orderApi';
import { EmptyState, ScreenError, ScreenLoader } from '../components/ScreenStates';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../format';
import { getStatusColor } from '../orderStatus';
import { useAsync } from '../useAsync';

function OrderHistoryPage() {
  const { user } = useAuth();

  // Se vuelve a pedir si cambia el usuario (por ejemplo, al cambiar de sesión).
  const { data, loading, error, reload } = useAsync(async () => {
    const orders = await getOrdersByUser(user.id);

    // [...orders] hace una copia antes de ordenar, porque sort() modifica el
    // array original. Restar dos fechas da los milisegundos de diferencia:
    // b - a deja el más reciente primero.
    return [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [user.id]);

  const orders = data ?? [];

  if (loading) {
    return <ScreenLoader label="Buscando tus pedidos…" />;
  }

  if (error) {
    return (
      <ScreenError
        title="No pudimos traer tus pedidos"
        message={error}
        onRetry={reload}
      />
    );
  }

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="lg">
        Mis pedidos
      </Title>

      {orders.length === 0 ? (
        <EmptyState
          icon={<IconPackage size={56} />}
          title="Todavía no hiciste ningún pedido"
          message="Cuando compres algo, lo vas a ver acá con su factura."
          actionTo="/catalogo"
          actionLabel="Ver productos"
        />
      ) : (
        <Card shadow="sm" padding={{ base: 'sm', sm: 'lg' }} radius="md" withBorder>
          {/* ScrollContainer: en celular la tabla se desliza de costado en vez
              de quedar cortada. */}
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
                      <Text fw={700}>{formatCurrency(order.total)}</Text>
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
      )}
    </Container>
  );
}

export default OrderHistoryPage;
