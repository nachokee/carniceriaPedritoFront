import { ActionIcon, NumberInput, Table, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { formatCurrency } from '../format';

// Tabla de items del pedido, compartida por OrderSummary, CheckoutPage y
// OrderConfirmationPage.
//
// Es un componente "tonto": no lee el contexto, solo muestra lo que recibe por
// props. Por eso sirve igual para el carrito (que se puede editar) que para la
// confirmación (donde el pedido ya está cerrado y los datos vienen del backend).
//
// - items: [{ productId, name, price, unit, quantity }]
// - editable: si es true muestra el NumberInput y el tacho de basura
// - onQuantityChange / onRemove: solo hacen falta si editable es true
//   onQuantityChange recibe el item entero (no solo el id) para que la
//   pantalla pueda avisar si la cantidad se pasó del stock.
function OrderItemsList({ items, editable = false, onQuantityChange, onRemove }) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Table.ScrollContainer minWidth={500}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Producto</Table.Th>
            <Table.Th>Precio</Table.Th>
            <Table.Th>Cantidad</Table.Th>
            <Table.Th ta="right">Subtotal</Table.Th>
            {editable && <Table.Th />}
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {items.map((item) => (
            <Table.Tr key={item.productId}>
              <Table.Td>
                <Text fw={700}>{item.name}</Text>
              </Table.Td>

              <Table.Td>
                <Text c="dimmed">
                  {formatCurrency(item.price)} / {item.unit}
                </Text>
              </Table.Td>

              <Table.Td>
                {editable ? (
                  <NumberInput
                    value={item.quantity}
                    // NumberInput puede devolver texto (''), por eso lo pasamos
                    // por Number() antes de guardarlo.
                    onChange={(value) => onQuantityChange(item, Number(value) || 0)}
                    min={0}
                    // max: Mantine ya no deja escribir más que el stock. Igual
                    // la pantalla avisa, para que se entienda por qué frenó.
                    max={item.stock}
                    step={1}
                    w={90}
                    aria-label={`Cantidad de ${item.name}`}
                  />
                ) : (
                  <Text>
                    {item.quantity} {item.unit}
                  </Text>
                )}
              </Table.Td>

              <Table.Td ta="right">
                <Text fw={700}>{formatCurrency(item.price * item.quantity)}</Text>
              </Table.Td>

              {editable && (
                <Table.Td>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => onRemove(item.productId)}
                    aria-label={`Quitar ${item.name}`}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>

        <Table.Tfoot>
          <Table.Tr>
            <Table.Th colSpan={3}>Total</Table.Th>
            <Table.Th ta="right">
              <Text fw={700} size="lg">
                {formatCurrency(total)}
              </Text>
            </Table.Th>
            {editable && <Table.Th />}
          </Table.Tr>
        </Table.Tfoot>
      </Table>
    </Table.ScrollContainer>
  );
}

export default OrderItemsList;
