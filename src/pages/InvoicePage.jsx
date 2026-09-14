import {
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { generateInvoice } from '../api/invoiceApi';
import { ScreenError, ScreenLoader } from '../components/ScreenStates';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateTime } from '../format';
import { useAsync } from '../useAsync';

function InvoicePage() {
  // useParams lee la parte variable de la URL: /invoice/mock-123 → 'mock-123'
  const { orderId } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const items = location.state?.items;

  const {
    data: invoice,
    loading,
    error,
    reload,
  } = useAsync(
    () =>
      generateInvoice(orderId, {
        customer: { name: user.name, email: user.email },
        // Los items vienen de la confirmación. Solo los usa el mock.
        items,
      }),
    [orderId, user.id],
  );

  if (loading) {
    return <ScreenLoader label="Generando la factura…" />;
  }

  if (error) {
    return (
      <ScreenError
        title="No pudimos generar la factura"
        message={error}
        onRetry={reload}
        backTo="/mis-pedidos"
        backLabel="Volver a mis pedidos"
      />
    );
  }

  return (
    <Container size="md" py="xl">
      <Card
        shadow="sm"
        padding={{ base: 'md', sm: 'xl' }}
        radius="md"
        withBorder
      >
        {/* Encabezado: número de factura, fecha y estado.
            wrap="wrap" hace que en celular el bloque de la derecha baje solo. */}
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <div>
            <Title order={2}>Factura</Title>
            <Text c="dimmed" size="sm">
              N° {invoice.invoiceId} · Pedido #{invoice.orderId}
            </Text>
            <Text c="dimmed" size="sm">
              {formatDateTime(invoice.date)}
            </Text>
          </div>

          <Stack align="flex-end" gap="xs">
            <Text fw={700} size="lg">
              Carnicería
            </Text>
            {/* tt="capitalize" muestra "emitida" como "Emitida" */}
            <Badge color="green" variant="light" tt="capitalize">
              {invoice.status}
            </Badge>
          </Stack>
        </Group>

        <Divider my="lg" />

        <div>
          <Text size="sm" c="dimmed">
            Facturado a
          </Text>
          <Text fw={700}>{invoice.customer?.name ?? '—'}</Text>
          <Text size="sm" c="dimmed">
            {invoice.customer?.email ?? '—'}
          </Text>
        </div>

        <Divider my="lg" />

        <Table.ScrollContainer minWidth={500}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Producto</Table.Th>
                <Table.Th ta="right">Cantidad</Table.Th>
                <Table.Th ta="right">Precio unitario</Table.Th>
                <Table.Th ta="right">Subtotal</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {invoice.items.map((item) => (
                // Usamos el nombre como key porque la factura no trae productId.
                <Table.Tr key={item.name}>
                  <Table.Td>{item.name}</Table.Td>
                  <Table.Td ta="right">
                    {item.quantity} {item.unit}
                  </Table.Td>
                  <Table.Td ta="right">{formatCurrency(item.price)}</Table.Td>
                  <Table.Td ta="right">{formatCurrency(item.subtotal)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Divider my="lg" />

        <Group justify="flex-end" gap="xl">
          <Text c="dimmed">Total</Text>
          <Text fw={700} size="xl">
            {formatCurrency(invoice.total)}
          </Text>
        </Group>
      </Card>

      {/* no-print: estos botones no salen en la impresión (ver index.css) */}
      <Group justify="space-between" mt="lg" wrap="wrap" className="no-print">
        <Button component={Link} to="/catalogo" variant="subtle" color="gray">
          Volver a productos
        </Button>

        {/* window.print() abre el diálogo del navegador; desde ahí se puede
            elegir "Guardar como PDF". */}
        <Button
          leftSection={<IconPrinter size={18} />}
          onClick={() => window.print()}
        >
          Descargar factura
        </Button>
      </Group>
    </Container>
  );
}

export default InvoicePage;
