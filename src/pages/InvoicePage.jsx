import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconPrinter } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { generateInvoice } from '../api/invoiceApi';
import { useAuth } from '../context/AuthContext';

// Formatea la fecha ISO que devuelve la API a algo legible: 11/9/2026, 10:45
const formatDate = (value) => new Date(value).toLocaleString('es-AR');

function InvoicePage() {
  // useParams lee la parte variable de la URL: /invoice/mock-123 → 'mock-123'
  const { orderId } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInvoice() {
      try {
        const data = await generateInvoice(orderId, {
          customer: { name: user.name, email: user.email },
          // Los items vienen de la confirmación. Solo los usa el mock.
          items: location.state?.items,
        });

        // Si la persona se fue de la pantalla antes de que llegue la respuesta,
        // no intentamos actualizar un componente que ya no está.
        if (!cancelled) setInvoice(data);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInvoice();

    return () => {
      cancelled = true;
    };
  }, [orderId, user, location.state]);

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
        <Alert color="red" icon={<IconAlertCircle size={18} />} title="No pudimos generar la factura">
          {error}
        </Alert>

        <Button component={Link} to="/" mt="md">
          Volver a productos
        </Button>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        {/* Encabezado: número de factura, fecha y estado */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2}>Factura</Title>
            <Text c="dimmed" size="sm">
              N° {invoice.invoiceId} · Pedido #{invoice.orderId}
            </Text>
            <Text c="dimmed" size="sm">
              {formatDate(invoice.date)}
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
          <Text fw={700}>{invoice.customer.name}</Text>
          <Text size="sm" c="dimmed">
            {invoice.customer.email}
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
                  <Table.Td ta="right">${item.price}</Table.Td>
                  <Table.Td ta="right">${item.subtotal}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Divider my="lg" />

        <Group justify="flex-end" gap="xl">
          <Text c="dimmed">Total</Text>
          <Text fw={700} size="xl">
            ${invoice.total}
          </Text>
        </Group>
      </Card>

      {/* no-print: estos botones no salen en la impresión (ver index.css) */}
      <Group justify="space-between" mt="lg" className="no-print">
        <Button component={Link} to="/" variant="subtle" color="gray">
          Volver a productos
        </Button>

        {/* window.print() abre el diálogo del navegador; desde ahí se puede
            elegir "Guardar como PDF". */}
        <Button leftSection={<IconPrinter size={18} />} onClick={() => window.print()}>
          Descargar factura
        </Button>
      </Group>
    </Container>
  );
}

export default InvoicePage;
