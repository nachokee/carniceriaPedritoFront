// Estados posibles de un pedido, en un solo lugar para que el historial del
// cliente y el panel de admin no se desincronicen.
export const ORDER_STATUSES = [
  'pendiente',
  'pagado',
  'listo para retirar',
  'entregado',
  'cancelado',
];

// Color del Badge según el estado. Cualquier estado que no esté acá cae en
// gris, así nunca queda un Badge sin color.
export const STATUS_COLORS = {
  pendiente: 'yellow',
  pagado: 'green',
  'listo para retirar': 'blue',
  entregado: 'teal',
  cancelado: 'red',
};

export const getStatusColor = (status) => STATUS_COLORS[status] ?? 'gray';
