import {
  Burger,
  Button,
  Container,
  Drawer,
  Group,
  Indicator,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLogout,
  IconMeat,
  IconReceipt,
  IconSettings,
  IconShoppingCart,
} from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrder } from '../context/OrderContext';

function Navbar() {
  // itemCount = cuántos productos distintos hay en el pedido (para el globito rojo).
  const { itemCount } = useOrder();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  // Estado del menú lateral de celular.
  const [drawerOpened, drawer] = useDisclosure(false);

  const handleLogout = async () => {
    drawer.close();
    await logout();
    navigate('/login', { replace: true });
  };

  // Los mismos botones se usan en la barra de escritorio y adentro del Drawer.
  // fullWidth los estira cuando están en el menú de celular.
  const links = (fullWidth = false) => (
    <>
      {isAdmin && (
        <Button
          component={Link}
          to="/admin/products"
          variant="subtle"
          color="gray"
          fullWidth={fullWidth}
          justify={fullWidth ? 'flex-start' : undefined}
          leftSection={<IconSettings size={18} />}
          onClick={drawer.close}
        >
          Panel admin
        </Button>
      )}

      <Button
        component={Link}
        to="/mis-pedidos"
        variant="subtle"
        fullWidth={fullWidth}
        justify={fullWidth ? 'flex-start' : undefined}
        leftSection={<IconReceipt size={18} />}
        onClick={drawer.close}
      >
        Mis pedidos
      </Button>
    </>
  );

  return (
    <>
      <Container size="lg" h="100%">
        <Group h="100%" justify="space-between" wrap="nowrap">
          {/* component={Link} hace que el Group navegue sin recargar la página */}
          <Group gap="xs" component={Link} to="/" wrap="nowrap">
            <IconMeat size={26} />
            <Text fw={700} size="lg">
              Carnicería
            </Text>
          </Group>

          {/* visibleFrom="sm": esta barra existe solo de tablet para arriba.
              En celular se reemplaza por el Burger de abajo. */}
          <Group gap="sm" visibleFrom="sm" wrap="nowrap">
            {user && (
              <Text size="sm" visibleFrom="md">
                Hola, {user.name}
              </Text>
            )}

            {links()}

            <Indicator
              label={itemCount}
              size={18}
              disabled={itemCount === 0}
              color="red"
            >
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

          {/* En celular dejamos a mano solo el carrito (que es la acción que
              más se usa) y el resto va adentro del menú. */}
          <Group gap="xs" hiddenFrom="sm" wrap="nowrap">
            <Indicator
              label={itemCount}
              size={18}
              disabled={itemCount === 0}
              color="red"
            >
              <Button
                component={Link}
                to="/pedido"
                variant="light"
                size="compact-md"
                aria-label="Mi pedido"
              >
                <IconShoppingCart size={18} />
              </Button>
            </Indicator>

            <Burger
              opened={drawerOpened}
              onClick={drawer.toggle}
              size="sm"
              aria-label="Abrir menú"
            />
          </Group>
        </Group>
      </Container>

      {/* Menú lateral de celular */}
      <Drawer
        opened={drawerOpened}
        onClose={drawer.close}
        position="right"
        size="xs"
        title={user ? `Hola, ${user.name}` : 'Menú'}
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

export default Navbar;
