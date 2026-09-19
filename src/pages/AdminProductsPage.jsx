import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Modal,
  NumberInput,
  Select,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPackage, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from '../api/catalogApi';
import { CATEGORIES, DEFAULT_CATEGORY, getCategoryColor } from '../categories';
import { EmptyState, ScreenError, ScreenLoader } from '../components/ScreenStates';
import { formatCurrency } from '../format';
import {
  MAX_DISCOUNT_PERCENT,
  MIN_DISCOUNT_PERCENT,
  getDisplayPrice,
} from '../pricing';
import { useAsync } from '../useAsync';

const UNITS = ['kg', 'unidad'];

// Los productos nuevos arrancan en "Otros" y sin oferta: el admin elige la
// categoría real en el Select y prende la oferta si quiere, antes de guardar.
const emptyForm = {
  name: '',
  price: 0,
  unit: 'kg',
  stock: 0,
  category: DEFAULT_CATEGORY,
  onOffer: false,
  discountPercent: 0,
};

function AdminProductsPage() {
  // reload() vuelve a pedir la lista después de cada alta, edición o baja.
  const { data, loading, error, reload } = useAsync(() => getProducts(), []);
  const products = data ?? [];

  const [saving, setSaving] = useState(false);

  // En celular el modal ocupa toda la pantalla: con el teclado abierto, un
  // modal flotante queda apretado y no se llega a los botones.
  const isMobile = useMediaQuery('(max-width: 48em)');

  // useDisclosure es un atajo de Mantine para manejar abierto/cerrado.
  const [formOpened, formHandlers] = useDisclosure(false);
  const [deleteOpened, deleteHandlers] = useDisclosure(false);

  // editing guarda el producto que estamos editando. Si es null, el modal
  // está en modo "crear". deleting guarda el producto a borrar.
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Un mensaje por campo: { name: 'Poné un nombre', price: '...' }
  const [formErrors, setFormErrors] = useState({});

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    formHandlers.open();
  };

  const openEdit = (product) => {
    setEditing(product);
    setFormErrors({});
    // Precargamos el formulario con los datos del producto.
    setForm({
      name: product.name,
      price: product.price,
      unit: product.unit,
      stock: product.stock ?? 0,
      // Un producto viejo (o de un backend que todavía no manda el campo)
      // puede no tener categoría: lo mostramos como "Otros".
      category: product.category ?? DEFAULT_CATEGORY,
      // Lo mismo con la oferta: si el producto no la tiene, el switch arranca
      // apagado y el porcentaje en 0.
      onOffer: Boolean(product.onOffer),
      discountPercent: product.discountPercent ?? 0,
    });
    formHandlers.open();
  };

  // Devuelve un objeto con un mensaje por cada campo que esté mal.
  // Si está todo bien, devuelve un objeto vacío.
  function validateForm() {
    const errors = {};

    if (!form.name.trim()) {
      errors.name = 'Poné un nombre';
    }

    if (form.price <= 0) {
      errors.price = 'El precio tiene que ser mayor a 0';
    }

    if (form.stock < 0) {
      errors.stock = 'El stock no puede ser negativo';
    }

    // El porcentaje solo se controla si la oferta está prendida: con el switch
    // apagado, el campo ni siquiera se ve.
    if (
      form.onOffer &&
      (form.discountPercent < MIN_DISCOUNT_PERCENT ||
        form.discountPercent > MAX_DISCOUNT_PERCENT)
    ) {
      errors.discountPercent =
        'El descuento tiene que estar entre ' + MIN_DISCOUNT_PERCENT + '% y ' +
        MAX_DISCOUNT_PERCENT + '%';
    }

    return errors;
  }

  const handleSave = async () => {
    const errors = validateForm();

    // Object.keys(...).length cuenta cuántos campos fallaron.
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSaving(true);

    // Si la oferta quedó apagada mandamos el descuento en 0. Si no, un producto
    // al que le sacaron la oferta se guardaría con el 15% viejo colgado y
    // volvería a aplicarse el día que alguien vuelva a prender el switch.
    const payload = {
      ...form,
      discountPercent: form.onOffer ? form.discountPercent : 0,
    };

    try {
      // El mismo modal sirve para crear y para editar: la diferencia es si
      // editing tiene algo adentro.
      if (editing) {
        await updateProduct(editing.id, payload);
        notifications.show({ message: 'Producto actualizado', color: 'green' });
      } else {
        await createProduct(payload);
        notifications.show({ message: 'Producto creado', color: 'green' });
      }

      formHandlers.close();
      reload();
    } catch (requestError) {
      notifications.show({
        title: 'No se pudo guardar',
        message: requestError.message,
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);

    try {
      await deleteProduct(deleting.id);
      notifications.show({ message: 'Producto borrado', color: 'green' });

      deleteHandlers.close();
      reload();
    } catch (requestError) {
      notifications.show({
        title: 'No se pudo borrar',
        message: requestError.message,
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ScreenLoader label="Cargando productos…" />;
  }

  if (error) {
    return (
      <ScreenError
        title="No pudimos cargar los productos"
        message={error}
        onRetry={reload}
        backTo="/admin/orders"
        backLabel="Ir a pedidos"
      />
    );
  }

  return (
    <Container size="md" py="xl">
      {/* wrap="wrap": en celular el botón baja abajo del título en vez de
          apretarse contra el borde. */}
      <Group justify="space-between" mb="lg" wrap="wrap" gap="sm">
        <Title order={2}>Productos</Title>

        <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
          Nuevo producto
        </Button>
      </Group>

      {products.length === 0 ? (
        <EmptyState
          icon={<IconPackage size={56} />}
          title="No hay productos cargados"
          message="Creá el primero con el botón de arriba."
        />
      ) : (
        <Card shadow="sm" padding={{ base: 'sm', sm: 'lg' }} radius="md" withBorder>
          {/* minWidth subió a 620 porque la tabla tiene una columna más
              (Categoría): abajo de ese ancho se scrollea en horizontal en vez
              de amontonarse. */}
          <Table.ScrollContainer minWidth={620}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>Categoría</Table.Th>
                  <Table.Th ta="right">Precio</Table.Th>
                  <Table.Th>Unidad</Table.Th>
                  <Table.Th ta="right">Stock</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {products.map((product) => (
                  <Table.Tr key={product.id}>
                    <Table.Td>
                      {/* El badge de oferta va pegado al nombre para que el
                          admin vea de un vistazo qué está con descuento, sin
                          tener que agregar otra columna a la tabla. */}
                      <Group gap="xs" wrap="nowrap">
                        <Text fw={700}>{product.name}</Text>

                        {product.onOffer && (
                          <Badge color="red" variant="filled" size="sm">
                            Oferta -{product.discountPercent}%
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {/* El color sale de getCategoryColor: mismo criterio que
                          en las tarjetas del catálogo. */}
                      <Badge
                        color={getCategoryColor(product.category)}
                        variant="light"
                      >
                        {product.category ?? DEFAULT_CATEGORY}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      {/* Con oferta mostramos también lo que se cobra de
                          verdad: el precio de lista solo, al lado del badge de
                          descuento, se presta a confusión. */}
                      {product.onOffer ? (
                        <Group gap="xs" justify="flex-end" align="baseline" wrap="nowrap">
                          <Text c="dimmed" td="line-through" size="sm">
                            {formatCurrency(product.price)}
                          </Text>

                          <Text fw={700} c="red">
                            {formatCurrency(getDisplayPrice(product).price)}
                          </Text>
                        </Group>
                      ) : (
                        formatCurrency(product.price)
                      )}
                    </Table.Td>
                    <Table.Td>{product.unit}</Table.Td>
                    <Table.Td ta="right">
                      {/* Sin stock lo marcamos en rojo para que salte a la vista */}
                      <Text
                        c={product.stock === 0 ? 'red' : undefined}
                        fw={product.stock === 0 ? 700 : undefined}
                      >
                        {product.stock ?? '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => openEdit(product)}
                          aria-label={`Editar ${product.name}`}
                        >
                          <IconPencil size={18} />
                        </ActionIcon>

                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => {
                            setDeleting(product);
                            deleteHandlers.open();
                          }}
                          aria-label={`Borrar ${product.name}`}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}

      {/* Modal de alta/edición */}
      <Modal
        opened={formOpened}
        onClose={formHandlers.close}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        fullScreen={isMobile}
      >
        <TextInput
          label="Nombre"
          placeholder="Asado de tira"
          required
          value={form.name}
          error={formErrors.name}
          onChange={(event) =>
            setForm({ ...form, name: event.currentTarget.value })
          }
        />

        {/* Las opciones salen de CATEGORIES (src/categories.js), así que el
            admin solo puede elegir una de las categorías que el catálogo sabe
            filtrar. allowDeselect={false} evita que quede en null al volver a
            clickear la opción ya elegida. */}
        <Select
          label="Categoría"
          data={CATEGORIES}
          mt="md"
          allowDeselect={false}
          value={form.category}
          onChange={(value) =>
            setForm({ ...form, category: value ?? DEFAULT_CATEGORY })
          }
        />

        <NumberInput
          label="Precio"
          prefix="$"
          min={0}
          mt="md"
          value={form.price}
          error={formErrors.price}
          onChange={(value) => setForm({ ...form, price: Number(value) || 0 })}
        />

        <NumberInput
          label="Stock disponible"
          description="En cero, el producto se muestra agotado en el catálogo"
          min={0}
          mt="md"
          value={form.stock}
          error={formErrors.stock}
          onChange={(value) => setForm({ ...form, stock: Number(value) || 0 })}
        />

        <Select
          label="Unidad"
          data={UNITS}
          mt="md"
          value={form.unit}
          onChange={(value) => setForm({ ...form, unit: value })}
        />

        {/* Oferta: el switch prende el descuento y recién ahí aparece el campo
            del porcentaje. Al apagarlo dejamos el porcentaje en 0 para que el
            formulario no guarde un descuento escondido. */}
        <Switch
          label="Producto en oferta"
          description="Aparece en la sección de ofertas de la pantalla de inicio"
          mt="lg"
          checked={form.onOffer}
          onChange={(event) => {
            const onOffer = event.currentTarget.checked;

            setForm({
              ...form,
              onOffer,
              discountPercent: onOffer ? form.discountPercent : 0,
            });
          }}
        />

        {form.onOffer && (
          <NumberInput
            label="Descuento"
            suffix="%"
            description={
              'Entre ' + MIN_DISCOUNT_PERCENT + '% y ' + MAX_DISCOUNT_PERCENT + '%'
            }
            min={MIN_DISCOUNT_PERCENT}
            max={MAX_DISCOUNT_PERCENT}
            mt="md"
            value={form.discountPercent}
            error={formErrors.discountPercent}
            onChange={(value) =>
              setForm({ ...form, discountPercent: Number(value) || 0 })
            }
          />
        )}

        {/* Adelanto de lo que va a ver el cliente, para no tener que hacer la
            cuenta de cabeza antes de guardar.
            isOnOffer del helper es el que manda: con el descuento en 0 (o con
            el precio sin cargar) no hay nada que adelantar y la línea diría
            "se va a cobrar $9.500 en vez de $9.500". */}
        {getDisplayPrice(form).isOnOffer && (
          <Text size="sm" c="dimmed" mt="xs">
            Se va a cobrar {formatCurrency(getDisplayPrice(form).price)} en vez de{' '}
            {formatCurrency(form.price)}.
          </Text>
        )}

        <Group justify="flex-end" mt="lg">
          <Button variant="subtle" color="gray" onClick={formHandlers.close}>
            Cancelar
          </Button>

          <Button onClick={handleSave} loading={saving}>
            Guardar
          </Button>
        </Group>
      </Modal>

      {/* Modal de confirmación de borrado */}
      <Modal
        opened={deleteOpened}
        onClose={deleteHandlers.close}
        title="Borrar producto"
        fullScreen={isMobile}
      >
        <Text>
          ¿Seguro que querés borrar <strong>{deleting?.name}</strong>? No se puede
          deshacer.
        </Text>

        <Group justify="flex-end" mt="lg">
          <Button variant="subtle" color="gray" onClick={deleteHandlers.close}>
            Cancelar
          </Button>

          <Button color="red" onClick={handleDelete} loading={saving}>
            Borrar
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}

export default AdminProductsPage;
