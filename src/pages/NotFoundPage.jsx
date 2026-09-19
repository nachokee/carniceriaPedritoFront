import { Container } from '@mantine/core';
import { IconMeatOff } from '@tabler/icons-react';
import { EmptyState } from '../components/ScreenStates';

// Cualquier dirección que no exista cae acá, por la ruta path="*" de App.jsx.
// Antes, escribir mal una URL dejaba la pantalla en blanco y parecía que la
// aplicación se había roto.
//
// Reusamos EmptyState, el mismo bloque que muestran el catálogo sin productos
// y el carrito vacío: un 404 es otro caso de "acá no hay nada para mostrar", y
// así se ve igual que el resto de la app sin escribir nada nuevo.
//
// La pantalla va FUERA de ProtectedRoute a propósito: una dirección mal escrita
// tiene que explicarse igual sin haber iniciado sesión (mandar al login sería
// más confuso que el error). Por eso tampoco tiene la barra de navegación, y el
// botón lleva a la pantalla de inicio, que es pública.
function NotFoundPage() {
  return (
    <Container size="sm" py={{ base: 40, sm: 80 }}>
      <EmptyState
        icon={<IconMeatOff size={56} />}
        title="Página no encontrada"
        message="La dirección que abriste no existe. Puede que el link esté mal escrito o que la página ya no esté."
        actionTo="/"
        actionLabel="Ir a la pantalla de inicio"
      />
    </Container>
  );
}

export default NotFoundPage;
