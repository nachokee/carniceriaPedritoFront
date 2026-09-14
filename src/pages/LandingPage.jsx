import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconClock,
  IconEgg,
  IconMapPin,
  IconMeat,
  IconPhone,
  IconPig,
  IconSausage,
  IconShoppingBag,
  IconUser,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { getOffers, getProducts } from '../api/catalogApi';
import { CATEGORIES, getCategoryColor } from '../categories';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../format';
import { useAsync } from '../useAsync';

// Ícono de cada categoría. Vive acá y no en src/categories.js porque es algo
// visual que solo usa esta pantalla: categories.js es una lista de datos y no
// tiene por qué saber de íconos.
// El ?? IconMeat de más abajo cubre cualquier categoría que no esté en esta
// tabla (por ejemplo una nueva que agregue el backend).
const CATEGORY_ICONS = {
  Vacuno: IconMeat,
  Cerdo: IconPig,
  Pollo: IconEgg,
  Embutidos: IconSausage,
  Otros: IconShoppingBag,
};

// En la home mostramos solo un adelanto del catálogo, no los productos todos.
const PREVIEW_COUNT = 6;

// Datos del local. Por ahora escritos a mano; el día que salgan de algún lado
// (una config, o el backend), se cambian solo acá.
const SHOP_INFO = {
  address: 'Av. Siempre Viva 742',
  hours: 'Lun a sáb, 9 a 20 hs',
  phone: '11 5555-5555',
};

// Alto del header: lo usamos dos veces (para fijarlo arriba y para que los
// links con # no dejen el título tapado detrás del header).
const HEADER_HEIGHT = 60;

// --- Piezas chicas que se usan varias veces en esta pantalla ---

// Título + bajada de cada sección, siempre igual.
function SectionHeading({ title, subtitle }) {
  return (
    <Stack gap={4} mb="lg">
      <Title order={2}>{title}</Title>
      {subtitle && <Text c="dimmed">{subtitle}</Text>}
    </Stack>
  );
}

// Lo que se muestra mientras una sección carga o si falla.
// No usamos ScreenError acá: esa pantalla ocupa todo el alto y sirve cuando
// falla LO ÚNICO que tenía la página. Acá, si se caen las ofertas, el resto de
// la home tiene que seguir viéndose igual.
function SectionState({ loading, error }) {
  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <Center py="xl">
      <Text c="dimmed" size="sm" ta="center">
        {error ?? 'No pudimos cargar esta sección. Probá recargando la página.'}
      </Text>
    </Center>
  );
}

function LandingPage() {
  // isAuthenticated nos dice si mostrar "Ingresar" o "Mi cuenta".
  const { isAuthenticated, user } = useAuth();

  // Dos pedidos independientes: si uno falla, el otro se sigue viendo.
  // El [] final significa "pedilo una sola vez, al entrar a la pantalla".
  const offersState = useAsync(() => getOffers(), []);
  const productsState = useAsync(() => getProducts(), []);

  const offers = offersState.data ?? [];

  // slice(0, 6) corta las primeras 6: el resto se ve entrando al catálogo.
  const previewProducts = (productsState.data ?? []).slice(0, PREVIEW_COUNT);

  return (
    <>
      {/* ---------- Header ---------- */}
      {/* position sticky: el header queda pegado arriba al scrollear.
          bg="white" para que el contenido no se transparente por detrás. */}
      <Box
        component="header"
        bg="white"
        h={HEADER_HEIGHT}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '1px solid var(--mantine-color-gray-3)',
        }}
      >
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <IconMeat size={26} />
              <Text fw={700} size="lg">
                Carnicería del Barrio
              </Text>
            </Group>

            {/* visibleFrom="sm": los links del medio existen solo de tablet
                para arriba. En celular quedaría todo apretado, así que se
                esconden y queda el botón de la derecha, que es lo importante. */}
            <Group gap="lg" visibleFrom="sm" wrap="nowrap">
              <Anchor href="#productos" c="dimmed" fw={500}>
                Catálogo
              </Anchor>
              <Anchor href="#nosotros" c="dimmed" fw={500}>
                Nosotros
              </Anchor>
              <Anchor href="#contacto" c="dimmed" fw={500}>
                Contacto
              </Anchor>
            </Group>

            {/* Si ya hay sesión no tiene sentido ofrecer "Ingresar": mostramos
                el acceso a los pedidos del usuario. */}
            {isAuthenticated ? (
              <Button
                component={Link}
                to="/mis-pedidos"
                variant="light"
                leftSection={<IconUser size={18} />}
              >
                Mi cuenta
              </Button>
            ) : (
              <Button component={Link} to="/login">
                Ingresar
              </Button>
            )}
          </Group>
        </Container>
      </Box>

      {/* ---------- Hero ---------- */}
      <Box
        bg="white"
        style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}
      >
        <Container size="lg" py={{ base: 48, sm: 80 }}>
          {/* maw + ta="center" centran el bloque de texto y evitan renglones
              larguísimos en pantallas anchas. */}
          <Stack align="center" ta="center" gap="md" maw={640} mx="auto">
            <Badge size="lg" variant="light" radius="sm">
              Retiro en local o pedí online
            </Badge>

            {/* order={1} es el <h1> de la página: el título principal. */}
            <Title order={1} fz={{ base: 32, sm: 44 }}>
              Carne fresca, todos los días
            </Title>

            <Text c="dimmed" fz={{ base: 'md', sm: 'lg' }}>
              Cortes de primera, atendidos por los mismos de siempre. Pedí por la
              web y retiralo por el local cuando te quede cómodo.
            </Text>

            {/* wrap="wrap" + el w de los botones: en celular cada uno ocupa
                todo el ancho y quedan uno abajo del otro. */}
            <Group mt="sm" justify="center" wrap="wrap" w="100%">
              <Button
                component={Link}
                to="/catalogo"
                size="md"
                rightSection={<IconArrowRight size={18} />}
                w={{ base: '100%', xs: 'auto' }}
              >
                Ver catálogo
              </Button>

              <Button
                component="a"
                href="#nosotros"
                size="md"
                variant="default"
                w={{ base: '100%', xs: 'auto' }}
              >
                Cómo funciona
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* ---------- Categorías ---------- */}
      <Container size="lg" py="xl">
        <SectionHeading
          title="Categorías"
          subtitle="Entrá directo a lo que estás buscando."
        />

        {/* columns={10} en vez de las 12 de siempre: como son 5 categorías,
            con 10 columnas cada una ocupa 2 y entran justo en una fila, sin
            números rotos. */}
        <Grid columns={10}>
          {CATEGORIES.map((category) => {
            // Guardamos el componente del ícono en una variable con mayúscula:
            // React solo trata como componente lo que empieza en mayúscula.
            const Icon = CATEGORY_ICONS[category] ?? IconMeat;

            return (
              // span 5 de 10 = media fila → 2 por fila en celular.
              // span 2 de 10 = un quinto → las 5 en una fila desde tablet.
              <Grid.Col key={category} span={{ base: 5, sm: 2 }}>
                {/* La Card entera es un link al catálogo ya filtrado. El
                    ?category=Vacuno lo lee ProductList y prende el filtro solo. */}
                <Card
                  component={Link}
                  to={`/catalogo?category=${encodeURIComponent(category)}`}
                  className="card-link"
                  padding="lg"
                  radius="md"
                  withBorder
                  h="100%"
                >
                  <Stack align="center" gap="xs">
                    <ThemeIcon
                      size={48}
                      radius="md"
                      variant="light"
                      color={getCategoryColor(category)}
                    >
                      <Icon size={26} />
                    </ThemeIcon>

                    <Text fw={600}>{category}</Text>
                  </Stack>
                </Card>
              </Grid.Col>
            );
          })}
        </Grid>
      </Container>

      {/* ---------- Ofertas ---------- */}
      <Box bg="white" style={{ borderBlock: '1px solid var(--mantine-color-gray-3)' }}>
        <Container size="lg" py="xl">
          <SectionHeading
            title="Ofertas de la semana"
            subtitle="Precios especiales hasta el sábado."
          />

          {offersState.loading || offersState.error ? (
            <SectionState
              loading={offersState.loading}
              error={offersState.error}
            />
          ) : offers.length === 0 ? (
            <Text c="dimmed">Esta semana no hay ofertas. ¡Volvé a mirar el lunes!</Text>
          ) : (
            <Grid>
              {offers.map((product) => (
                <Grid.Col key={product.id} span={{ base: 12, xs: 6, md: 4 }}>
                  <Card
                    component={Link}
                    to="/catalogo"
                    className="card-link"
                    padding="lg"
                    radius="md"
                    withBorder
                    h="100%"
                  >
                    {/* El badge del descuento arriba de todo, que es lo que
                        hace que la tarjeta se mire. */}
                    <Group justify="space-between" wrap="nowrap" mb="xs">
                      <Badge color="red" variant="filled">
                        -{product.discountPercent}%
                      </Badge>

                      <Badge
                        color={getCategoryColor(product.category)}
                        variant="light"
                        size="sm"
                      >
                        {product.category}
                      </Badge>
                    </Group>

                    <Text fw={700} size="lg">
                      {product.name}
                    </Text>

                    {/* El precio viejo tachado al lado del nuevo: se entiende
                        de un vistazo cuánto se ahorra. */}
                    <Group gap="xs" align="baseline" mt={4}>
                      <Text c="dimmed" td="line-through" size="sm">
                        {formatCurrency(product.price)}
                      </Text>

                      <Text fw={700} size="xl" c="red">
                        {formatCurrency(product.discountedPrice)}
                      </Text>

                      <Text c="dimmed" size="sm">
                        / {product.unit}
                      </Text>
                    </Group>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          )}
        </Container>
      </Box>

      {/* ---------- Cómo funciona (es también el ancla de "Nosotros") ---------- */}
      {/* scrollMarginTop: cuando se llega acá por el link #nosotros, el navegador
          frena esta cantidad de píxeles antes, así el header fijo no tapa el
          título. */}
      <Container size="lg" py="xl" id="nosotros" style={{ scrollMarginTop: HEADER_HEIGHT }}>
        <SectionHeading
          title="Cómo funciona"
          subtitle="Somos la carnicería del barrio de siempre, ahora también online."
        />

        <Grid>
          {[
            {
              icon: IconShoppingBag,
              title: '1. Armá tu pedido',
              text: 'Elegí los cortes del catálogo y agregalos al pedido.',
            },
            {
              icon: IconClock,
              title: '2. Lo preparamos',
              text: 'Cortamos y envasamos todo en el momento, recién salido de la cámara.',
            },
            {
              icon: IconMapPin,
              title: '3. Pasá a retirarlo',
              text: 'Te avisamos cuando está listo y lo retirás por el local.',
            },
          ].map((step) => (
            <Grid.Col key={step.title} span={{ base: 12, sm: 4 }}>
              <Card padding="lg" radius="md" withBorder h="100%">
                <ThemeIcon size={44} radius="md" variant="light" mb="sm">
                  <step.icon size={24} />
                </ThemeIcon>

                <Text fw={700} mb={4}>
                  {step.title}
                </Text>

                <Text c="dimmed" size="sm">
                  {step.text}
                </Text>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Container>

      {/* ---------- Nuestros productos ---------- */}
      <Box
        bg="white"
        id="productos"
        style={{
          borderBlock: '1px solid var(--mantine-color-gray-3)',
          scrollMarginTop: HEADER_HEIGHT,
        }}
      >
        <Container size="lg" py="xl">
          <SectionHeading
            title="Nuestros productos"
            subtitle="Un adelanto de lo que vas a encontrar en el catálogo."
          />

          {productsState.loading || productsState.error ? (
            <SectionState
              loading={productsState.loading}
              error={productsState.error}
            />
          ) : (
            <>
              <Grid>
                {previewProducts.map((product) => (
                  <Grid.Col key={product.id} span={{ base: 12, xs: 6, md: 4 }}>
                    {/* Mismo estilo de tarjeta que el catálogo, pero sin el
                        botón de agregar: desde la home solo se mira. */}
                    <Card padding="lg" radius="md" withBorder h="100%">
                      <Badge
                        color={getCategoryColor(product.category)}
                        variant="light"
                        size="sm"
                        mb="xs"
                        w="fit-content"
                      >
                        {product.category}
                      </Badge>

                      <Text fw={700} size="lg">
                        {product.name}
                      </Text>

                      <Text c="dimmed" mt={4}>
                        {formatCurrency(product.price)} / {product.unit}
                      </Text>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>

              <Center mt="xl">
                <Button
                  component={Link}
                  to="/catalogo"
                  variant="light"
                  size="md"
                  rightSection={<IconArrowRight size={18} />}
                >
                  Ver más
                </Button>
              </Center>
            </>
          )}
        </Container>
      </Box>

      {/* ---------- Footer / contacto ---------- */}
      <Box component="footer" id="contacto" style={{ scrollMarginTop: HEADER_HEIGHT }}>
        <Container size="lg" py="xl">
          <Group justify="space-between" wrap="wrap" gap="lg">
            <Stack gap={4}>
              <Group gap="xs">
                <IconMeat size={20} />
                <Text fw={700}>Carnicería del Barrio</Text>
              </Group>

              <Text c="dimmed" size="sm">
                {isAuthenticated
                  ? `Gracias por comprar con nosotros, ${user?.name}.`
                  : 'Atendido por sus dueños desde 1998.'}
              </Text>
            </Stack>

            {/* En celular estos tres bajan uno abajo del otro por el wrap. */}
            <Group gap="lg" wrap="wrap">
              <Group gap="xs" wrap="nowrap">
                <IconMapPin size={18} />
                <Text size="sm">{SHOP_INFO.address}</Text>
              </Group>

              <Group gap="xs" wrap="nowrap">
                <IconClock size={18} />
                <Text size="sm">{SHOP_INFO.hours}</Text>
              </Group>

              <Group gap="xs" wrap="nowrap">
                <IconPhone size={18} />
                <Text size="sm">{SHOP_INFO.phone}</Text>
              </Group>
            </Group>
          </Group>

          <Divider my="lg" />

          <Text c="dimmed" size="xs" ta="center">
            Carnicería del Barrio — Proyecto de la materia, datos de ejemplo.
          </Text>
        </Container>
      </Box>
    </>
  );
}

export default LandingPage;
