import { Button, Container, Group, Text } from '@mantine/core';
import { IconLogout, IconMeat, IconPackage, IconReceipt2 } from '@tabler/icons-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // useLocation nos dice en qué URL estamos, para marcar el link activo.
  const { pathname } = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Container size="lg" h="100%">
      <Group h="100%" justify="space-between">
        <Group gap="xs">
          <IconMeat size={26} />
          <Text fw={700} size="lg">
            Carnicería
          </Text>
          <Text c="dimmed" size="sm">
            Panel de administración
          </Text>
        </Group>

        <Group gap="sm">
          {/* El botón de la pantalla en la que estamos se ve "lleno" (filled)
              y el otro apenas marcado (subtle). */}
          <Button
            component={Link}
            to="/admin/products"
            variant={pathname === '/admin/products' ? 'light' : 'subtle'}
            leftSection={<IconPackage size={18} />}
          >
            Productos
          </Button>

          <Button
            component={Link}
            to="/admin/orders"
            variant={pathname === '/admin/orders' ? 'light' : 'subtle'}
            leftSection={<IconReceipt2 size={18} />}
          >
            Pedidos
          </Button>

          {user && (
            <Text size="sm" visibleFrom="sm">
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
      </Group>
    </Container>
  );
}

export default AdminNavbar;
