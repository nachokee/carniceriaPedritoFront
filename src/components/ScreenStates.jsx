import { Alert, Button, Center, Container, Loader, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

// Las tres pantallas "de transición" que toda vista de datos necesita:
// cargando, error y vacío. Están acá para que se vean iguales en toda la app.

// Mientras viaja el pedido.
export function ScreenLoader({ label = 'Cargando…' }) {
  return (
    <Center h={300}>
      <Stack align="center" gap="sm">
        <Loader />
        <Text size="sm" c="dimmed">
          {label}
        </Text>
      </Stack>
    </Center>
  );
}

// Cuando el pedido falla. onRetry es opcional: si viene, se muestra el botón
// de reintentar (que vuelve a llamar a la API sin recargar la página).
export function ScreenError({
  title = 'Algo salió mal',
  message,
  onRetry,
  backTo = '/catalogo',
  backLabel = 'Volver a productos',
}) {
  return (
    <Container size="sm" py="xl">
      <Alert color="red" icon={<IconAlertCircle size={18} />} title={title}>
        {message ?? 'No pudimos completar la operación. Probá de nuevo en un momento.'}
      </Alert>

      <Stack mt="md" gap="sm">
        {onRetry && <Button onClick={onRetry}>Reintentar</Button>}

        <Button component={Link} to={backTo} variant="subtle" color="gray">
          {backLabel}
        </Button>
      </Stack>
    </Container>
  );
}

// Cuando no hay nada que mostrar (sin productos, sin pedidos, carrito vacío).
// icon es opcional y se pasa ya renderizado: <IconPackage size={56} />
export function EmptyState({ icon, title, message, actionTo, actionLabel }) {
  return (
    <Center py={60}>
      <Stack align="center" gap="xs" maw={320} ta="center">
        {icon}

        {title && (
          <Text fw={700} size="lg">
            {title}
          </Text>
        )}

        <Text c="dimmed">{message}</Text>

        {actionTo && (
          <Button component={Link} to={actionTo} mt="sm">
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Center>
  );
}
