import { Button, Center, Code, Container, Group, Stack, Text, Title } from '@mantine/core';
import { IconMoodSad } from '@tabler/icons-react';
import { Component } from 'react';

// Red de seguridad: si un componente tira un error que nadie atrapó, React
// desmonta TODA la app y queda la pantalla en blanco. Este componente atrapa
// esos errores y muestra algo entendible en su lugar.
//
// Tiene que ser una clase: los error boundaries son la única cosa que React
// todavía no permite escribir con hooks.
class ErrorBoundary extends Component {
  state = { error: null };

  // React llama a esto cuando un hijo revienta, y lo que devuelve pasa a ser
  // el nuevo state. Así sabemos que hay que mostrar el mensaje de error.
  static getDerivedStateFromError(error) {
    return { error };
  }

  // Acá iría el envío del error a un servicio de monitoreo (Sentry y demás).
  // Por ahora lo dejamos en la consola.
  componentDidCatch(error, info) {
    console.error('Error no controlado:', error, info);
  }

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <Container size="sm">
        <Center mih="100vh">
          <Stack align="center" gap="sm" ta="center">
            <IconMoodSad size={56} />

            <Title order={2}>Se nos rompió algo</Title>

            <Text c="dimmed">
              Tuvimos un problema inesperado. Podés recargar la página y seguir
              comprando; si vuelve a pasar, avisanos.
            </Text>

            {/* El detalle técnico sirve para reportar el problema */}
            <Code block mt="sm">
              {error.message}
            </Code>

            <Group mt="md">
              <Button onClick={() => window.location.reload()}>
                Recargar la página
              </Button>

              <Button
                variant="subtle"
                color="gray"
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                Ir al inicio
              </Button>
            </Group>
          </Stack>
        </Center>
      </Container>
    );
  }
}

export default ErrorBoundary;
