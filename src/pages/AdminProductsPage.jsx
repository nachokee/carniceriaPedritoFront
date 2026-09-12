import {
  ActionIcon,
  Button,
  Card,
  Center,
  Container,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from '../api/catalogApi';

const UNITS = ['kg', 'unidad'];

const emptyForm = { name: '', price: 0, unit: 'kg' };

function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // useDisclosure es un atajo de Mantine para manejar abierto/cerrado.
  const [formOpened, formHandlers] = useDisclosure(false);
  const [deleteOpened, deleteHandlers] = useDisclosure(false);

  // editing guarda el producto que estamos editando. Si es null, el modal
  // está en modo "crear". deleting guarda el producto a borrar.
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Vuelve a pedir la lista al backend (o al mock). La llamamos al entrar y
  // después de cada alta, edición o baja.
  async function loadProducts() {
    const data = await getProducts();
    setProducts(data);
    setLoading(false);
  }

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- loadProducts es async: el setState corre después del await, no en el render
    loadProducts();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    formHandlers.open();
  };

  const openEdit = (product) => {
    setEditing(product);
    // Precargamos el formulario con los datos del producto.
    setForm({ name: product.name, price: product.price, unit: product.unit });
    formHandlers.open();
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // El mismo modal sirve para crear y para editar: la diferencia es si
      // editing tiene algo adentro.
      if (editing) {
        await updateProduct(editing.id, form);
        notifications.show({ message: 'Producto actualizado', color: 'green' });
      } else {
        await createProduct(form);
        notifications.show({ message: 'Producto creado', color: 'green' });
      }

      formHandlers.close();
      await loadProducts();
    } catch (error) {
      notifications.show({ title: 'No se pudo guardar', message: error.message, color: 'red' });
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
      await loadProducts();
    } catch (error) {
      notifications.show({ title: 'No se pudo borrar', message: error.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Productos</Title>

        <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
          Nuevo producto
        </Button>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Table.ScrollContainer minWidth={500}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th ta="right">Precio</Table.Th>
                <Table.Th>Unidad</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {products.map((product) => (
                <Table.Tr key={product.id}>
                  <Table.Td>
                    <Text fw={700}>{product.name}</Text>
                  </Table.Td>
                  <Table.Td ta="right">${product.price}</Table.Td>
                  <Table.Td>{product.unit}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end">
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

      {/* Modal de alta/edición */}
      <Modal
        opened={formOpened}
        onClose={formHandlers.close}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
      >
        <TextInput
          label="Nombre"
          placeholder="Asado de tira"
          required
          value={form.name}
          onChange={(event) =>
            setForm({ ...form, name: event.currentTarget.value })
          }
        />

        <NumberInput
          label="Precio"
          prefix="$"
          min={0}
          mt="md"
          value={form.price}
          onChange={(value) => setForm({ ...form, price: Number(value) || 0 })}
        />

        <Select
          label="Unidad"
          data={UNITS}
          mt="md"
          value={form.unit}
          onChange={(value) => setForm({ ...form, unit: value })}
        />

        <Group justify="flex-end" mt="lg">
          <Button variant="subtle" color="gray" onClick={formHandlers.close}>
            Cancelar
          </Button>

          <Button onClick={handleSave} loading={saving} disabled={!form.name.trim()}>
            Guardar
          </Button>
        </Group>
      </Modal>

      {/* Modal de confirmación de borrado */}
      <Modal opened={deleteOpened} onClose={deleteHandlers.close} title="Borrar producto">
        <Text>
          ¿Seguro que querés borrar <strong>{deleting?.name}</strong>? No se puede deshacer.
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
