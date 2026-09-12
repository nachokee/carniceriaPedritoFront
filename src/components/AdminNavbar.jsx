import {
  Burger,
  Button,
  Container,
  Drawer,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLogout,
  IconMeat,
  IconPackage,
  IconReceipt2,
} from '@tabler/icons-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // useLocation nos dice en qué URL estamos, para marcar el link activo.
  const { pathname } = useLocation();

  const [drawerOpened, drawer] = useDisclosure(false);

  const handleLogout = async () => {
    drawer.close();
    await logout();
    navigate('/login', { replace: true });
  };

  // Los mismos links sirven para la barra de escritorio y para el Drawer.
  const links = (fullWidth = false) => (
    <>
      {/* El botón de la pantalla en la que estamos se ve marcado (light) y el
          otro apenas insinuado (subtle). */}
      <Button
        component={Link}
        to="/admin/products"
        variant={pathname === '/admin/products' ? 'light' : 'subtle'}
        fullWidth={fullWidth}
        justify={fullWidth ? 'flex-start' : undefined}
        leftSection={<IconPackage size={18} />}
        onClick={drawer.close}
      >
        Productos
      </Button>

      <Button
        component={Link}
        to="/admin/orders"
        variant={pathname === '/admin/orders' ? 'light' : 'subtle'}
        fullWidth={fullWidth}
        justify={fullWidth ? 'flex-start' : undefined}
        leftSection={<IconReceipt2 size={18} />}
        onClick={drawer.close}
      >
        Pedidos
      </Button>
    </>
  );

  return (
    <>
      <Container size="lg" h="100%">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <IconMeat size={26} />
            <Text fw={700} size="lg">
              Carnicería
            </Text>
            <Text c="dimmed" size="sm" visibleFrom="md">
              Panel de administración
            </Text>
          </Group>

          <Group gap="sm" visibleFrom="sm" wrap="nowrap">
            {links()}

            {user && (
              <Text size="sm" visibleFrom="md">
                Hola, {user.name}
              </Text>
            )}

            <Button
              variant="subtle"
              color="gray"
              onClick={handleLogout}
              leftSection={<IconLogout size={18} />}
            >
              Cerrar sesión
            </Button>
          </Group>

          <Burger
            opened={drawerOpened}
            onClick={drawer.toggle}
            size="sm"
            hiddenFrom="sm"
            aria-label="Abrir menú"
          />
        </Group>
      </Container>

      <Drawer
        opened={drawerOpened}
        onClose={drawer.close}
        position="right"
        size="xs"
        title={user ? `Hola, ${user.name}` : 'Panel'}
        hiddenFrom="sm"
      >
        <Stack gap="xs">
          {links(true)}

          <Button
            variant="subtle"
            color="gray"
            fullWidth
            justify="flex-start"
            onClick={handleLogout}
            leftSection={<IconLogout size={18} />}
          >
            Cerrar sesión
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}

export default AdminNavbar;
