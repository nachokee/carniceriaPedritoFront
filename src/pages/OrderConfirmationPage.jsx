import { Alert, Button, Card, Container, Group, Text, Title } from '@mantine/core';
import { IconCheck, IconFileInvoice } from '@tabler/icons-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import OrderItemsList from '../components/OrderItemsList';

function OrderConfirmationPage() {
  // Los datos del pedido llegan por el "state" que le pasó CheckoutPage a
  // navigate(). No los leemos del carrito porque a esta altura ya se vació.
  const location = useLocation();
  const data = location.state;

  // Si alguien entra directo a /order-confirmation (o recarga la página), no
  // hay state: lo mandamos al listado de productos.
  if (!data) {
    return <Navigate to="/" replace />;
  }

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="lg">
        ¡Gracias por tu compra!
      </Title>

      <Alert color="green" icon={<IconCheck size={18} />} title="Pago aprobado">
        Pedido número #{data.orderId}
        {data.payment.paymentId && ` · Pago #${data.payment.paymentId}`}
      </Alert>

      <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
        <Text fw={700} mb="sm">
          Resumen
        </Text>

        <OrderItemsList items={data.items} />
      </Card>

      <Group mt="lg">
        <Button component={Link} to="/">
          Hacer otro pedido
        </Button>

        {/* Le pasamos los items a la factura por el state, igual que hizo el
            checkout con esta pantalla: el mock los necesita para armarla. */}
        <Button
          component={Link}
          to={`/invoice/${data.orderId}`}
          state={{ items: data.items }}
          variant="light"
          leftSection={<IconFileInvoice size={18} />}
        >
          Ver factura
        </Button>
      </Group>
    </Container>
  );
}

export default OrderConfirmationPage;
