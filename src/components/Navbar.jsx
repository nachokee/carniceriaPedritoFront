import { Button, Container, Group, Indicator, Text } from '@mantine/core';
import { IconLogout, IconMeat, IconReceipt, IconSettings, IconShoppingCart } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrder } from '../context/OrderContext';

function Navbar() {
  // itemCount = cuántos productos distintos hay en el pedido (para el globito rojo).
  const { itemCount } = useOrder();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Container size="lg" h="100%">
      <Group h="100%" justify="space-between">
        {/* component={Link} hace que el Group navegue sin recargar la página */}
        <Group gap="xs" component={Link} to="/">
          <IconMeat size={26} />
          <Text fw={700} size="lg">
            Carnicería
          </Text>
        </Group>

        <Group gap="sm">
          {/* visibleFrom="sm": el saludo se esconde en pantallas chicas */}
          {user && (
            <Text size="sm" visibleFrom="sm">
              Hola, {user.name}
            </Text>
          )}

          {/* Este botón solo existe para admins: un cliente nunca ve que
              el panel está ahí. */}
          {isAdmin && (
            <Button
              component={Link}
              to="/admin/products"
              variant="subtle"
              color="gray"
              leftSection={<IconSettings size={18} />}
            >
              Panel admin
            </Button>
          )}

          <Button
            component={Link}
            to="/mis-pedidos"
            variant="subtle"
            leftSection={<IconReceipt size={18} />}
          >
            Mis pedidos
          </Button>

          <Indicator label={itemCount} size={18} disabled={itemCount === 0} color="red">
            <Button
              component={Link}
              to="/pedido"
              variant="light"
              leftSection={<IconShoppingCart size={18} />}
            >
              Mi pedido
            </Button>
          </Indicator>

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

export default Navbar;
