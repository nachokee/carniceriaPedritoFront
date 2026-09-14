import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Radio,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { decreaseStock } from '../api/catalogApi';
import { submitOrder } from '../api/orderApi';
import { processPayment } from '../api/paymentApi';
import OrderItemsList from '../components/OrderItemsList';
import { useAuth } from '../context/AuthContext';
import { useOrder } from '../context/OrderContext';

function CheckoutPage() {
  const { items, total, clearOrder } = useOrder();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [method, setMethod] = useState('efectivo');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const [processing, setProcessing] = useState(false);

  // Dos tipos de error distintos:
  // - fieldErrors: lo que está mal en un campo, se muestra debajo del campo.
  // - error: lo que falló del lado del servidor (pago rechazado, sin stock,
  //   red caída), se muestra como Alert arriba de los botones.
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);

  // Guardamos el orderId cuando el pedido se crea bien. Si después falla el
  // pago, al reintentar reusamos este id en vez de crear un pedido nuevo.
  const [orderId, setOrderId] = useState(null);

  // Lo mismo con el stock: si ya lo descontamos y después falla el pago, al
  // reintentar no hay que descontarlo de nuevo.
  const [stockDescontado, setStockDescontado] = useState(false);

  // Se prende cuando la compra terminó bien, justo antes de vaciar el carrito.
  //
  // Hace falta por esto: al terminar, la pantalla hace dos cosas casi a la vez,
  // navegar a la confirmación y vaciar el carrito. Si el carrito queda vacío
  // antes de que la navegación termine, el chequeo de acá abajo se dispara y
  // manda a /pedido, tapando la confirmación. La compra se hacía igual, pero la
  // persona nunca veía la pantalla de "¡Gracias por tu compra!" y le quedaba la
  // sensación de que algo falló. Lo encontró el test de punta a punta.
  const [compraTerminada, setCompraTerminada] = useState(false);

  // Si alguien entra a /checkout con el carrito vacío, lo mandamos al pedido.
  // Salvo que el carrito esté vacío justamente porque acaba de comprar.
  if (items.length === 0 && !compraTerminada) {
    return <Navigate to="/pedido" replace />;
  }

  // Chequeos mínimos de formato, un mensaje por campo.
  function validate() {
    const errors = {};

    // En efectivo no hay nada que validar.
    if (method !== 'tarjeta') {
      return errors;
    }

    if (cardNumber.replace(/\s/g, '').length !== 16) {
      errors.cardNumber = 'Tiene que tener 16 dígitos';
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      errors.expiry = 'Formato MM/AA';
    }

    if (cvv.length !== 3) {
      errors.cvv = 'Son 3 dígitos';
    }

    return errors;
  }

  const handlePay = async () => {
    const errors = validate();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setProcessing(true);

    try {
      // Paso 1: crear el pedido (solo la primera vez).
      let currentOrderId = orderId;

      if (!currentOrderId) {
        const order = await submitOrder(items, user.id);
        currentOrderId = order.orderId;
        setOrderId(currentOrderId);
      }

      // Paso 2: descontar el stock ANTES de cobrar. Si algún producto se quedó
      // sin stock mientras la persona completaba el checkout, decreaseStock
      // lanza un error y cortamos acá: no se cobra nada y el carrito queda
      // intacto para que pueda ajustar el pedido.
      if (!stockDescontado) {
        await decreaseStock(
          items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        );

        setStockDescontado(true);
      }

      // Paso 3: cobrar. En producción los datos de la tarjeta irían directo a
      // la pasarela de pago, nunca a nuestro backend.
      const paymentInfo =
        method === 'tarjeta' ? { method, cardNumber, expiry, cvv } : { method };

      const payment = await processPayment(currentOrderId, paymentInfo);

      // El pago puede responder OK (200) pero venir rechazado: hay que mirar el status.
      if (payment.status !== 'approved') {
        setError(
          payment.message ?? 'El pago fue rechazado. Probá con otro medio de pago.',
        );
        return;
      }

      // Paso 4: salió todo bien. Le pasamos los datos a la pantalla de
      // confirmación por el "state" de navigate, porque el carrito se vacía acá.
      //
      // El orden importa: primero avisamos que la compra terminó (si no, vaciar
      // el carrito nos rebota a /pedido antes de llegar a la confirmación).
      setCompraTerminada(true);

      navigate('/order-confirmation', {
        replace: true,
        state: { orderId: currentOrderId, payment, items, total },
      });

      clearOrder();
    } catch (requestError) {
      // Acá caen los errores de red o del servidor y la falta de stock. En
      // todos los casos el carrito queda intacto para poder reintentar.
      setError(requestError.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="lg">
        Checkout
      </Title>

      <Card shadow="sm" padding={{ base: 'sm', sm: 'lg' }} radius="md" withBorder>
        <Text fw={700} mb="sm">
          Tu pedido
        </Text>

        <OrderItemsList items={items} />
      </Card>

      <Card
        shadow="sm"
        padding={{ base: 'sm', sm: 'lg' }}
        radius="md"
        withBorder
        mt="md"
      >
        <Radio.Group
          value={method}
          onChange={setMethod}
          label="¿Cómo querés pagar?"
          mb={method === 'tarjeta' ? 'md' : 0}
        >
          <Group mt="xs">
            <Radio value="efectivo" label="Efectivo" />
            <Radio value="tarjeta" label="Tarjeta" />
          </Group>
        </Radio.Group>

        {/* Los campos de la tarjeta solo aparecen si elegiste tarjeta */}
        {method === 'tarjeta' && (
          <Stack gap="sm">
            <TextInput
              label="Número de tarjeta"
              placeholder="4111111111111111"
              maxLength={16}
              inputMode="numeric"
              value={cardNumber}
              error={fieldErrors.cardNumber}
              onChange={(event) => setCardNumber(event.currentTarget.value)}
            />

            {/* grow reparte el ancho entre los dos campos; en celular Mantine
                los apila solo si no entran. */}
            <Group grow align="flex-start">
              <TextInput
                label="Vencimiento"
                placeholder="12/28"
                maxLength={5}
                inputMode="numeric"
                value={expiry}
                error={fieldErrors.expiry}
                onChange={(event) => setExpiry(event.currentTarget.value)}
              />

              <TextInput
                label="CVV"
                placeholder="123"
                maxLength={3}
                inputMode="numeric"
                value={cvv}
                error={fieldErrors.cvv}
                onChange={(event) => setCvv(event.currentTarget.value)}
              />
            </Group>

            <Text size="xs" c="dimmed">
              Modo de prueba: cualquier tarjeta terminada en 0 sale rechazada.
            </Text>
          </Stack>
        )}
      </Card>

      {error && (
        <Alert
          color="red"
          icon={<IconAlertCircle size={18} />}
          mt="md"
          title="No se pudo completar la compra"
        >
          {error}
        </Alert>
      )}

      {/* En celular (base) cada botón ocupa todo el ancho y quedan uno abajo
          del otro, con el de pagar último, cerca del pulgar. Desde xs vuelven
          a la misma fila. */}
      <Group justify="space-between" mt="lg" wrap="wrap">
        <Button
          component={Link}
          to="/pedido"
          variant="subtle"
          color="gray"
          w={{ base: '100%', xs: 'auto' }}
        >
          Volver al pedido
        </Button>

        <Button
          size="md"
          loading={processing}
          onClick={handlePay}
          w={{ base: '100%', xs: 'auto' }}
        >
          Confirmar y pagar
        </Button>
      </Group>
    </Container>
  );
}

export default CheckoutPage;
