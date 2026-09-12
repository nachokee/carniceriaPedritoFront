import axiosClient from './axiosClient';

// Mismo patrón que catalogApi.js: mientras no exista el order-service,
// devolvemos una respuesta falsa. Cuando esté listo, poner USE_MOCK en false.
const USE_MOCK = true;

// let y no const: updateOrderStatus reemplaza esta lista durante la sesión.
// Cada pedido lleva userId y customerName porque el panel de admin muestra
// los pedidos de todos los clientes, no solo los del usuario logueado.
let mockOrders = [
  {
    orderId: 'mock-1',
    userId: 1,
    customerName: 'Juan Pérez',
    date: '2026-08-20T10:00:00Z',
    total: 8700,
    status: 'entregado',
    items: [
      { productId: 4, name: 'Pollo entero', price: 4500, unit: 'kg', quantity: 1 },
      { productId: 5, name: 'Chorizo criollo', price: 4200, unit: 'kg', quantity: 1 },
    ],
  },
  {
    orderId: 'mock-2',
    userId: 1,
    customerName: 'Juan Pérez',
    date: '2026-09-01T15:30:00Z',
    total: 4500,
    status: 'pagado',
    items: [
      { productId: 4, name: 'Pollo entero', price: 4500, unit: 'kg', quantity: 1 },
    ],
  },
  {
    orderId: 'mock-3',
    userId: 1,
    customerName: 'Juan Pérez',
    date: '2026-09-08T12:15:00Z',
    total: 17800,
    status: 'pendiente',
    items: [
      { productId: 1, name: 'Asado de tira', price: 8900, unit: 'kg', quantity: 2 },
    ],
  },
  {
    orderId: 'mock-4',
    userId: 4,
    customerName: 'Lucía Gómez',
    date: '2026-09-10T09:45:00Z',
    total: 21400,
    status: 'listo para retirar',
    items: [
      { productId: 6, name: 'Milanesas de ternera', price: 10700, unit: 'kg', quantity: 2 },
    ],
  },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function submitOrder(items, userId) {
  if (USE_MOCK) {
    // Esperamos 800ms para simular la demora de una llamada real y poder ver
    // el estado "cargando" del botón.
    await delay(800);

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return { orderId: 'mock-123', status: 'pendiente', userId, items, total };
  }

  const response = await axiosClient.post('/orders', { items, userId });
  return response.data;
}

export async function getOrdersByUser(userId) {
  if (USE_MOCK) {
    await delay(600);

    // El mock sí filtra por usuario, igual que va a hacer el backend.
    return mockOrders.filter((order) => order.userId === userId);
  }

  const response = await axiosClient.get(`/orders?userId=${userId}`);
  return response.data;
}

// --- Funciones de administración ---

export async function getAllOrders() {
  if (USE_MOCK) {
    await delay(600);

    // Copia, por el mismo motivo que en catalogApi.getProducts().
    return [...mockOrders];
  }

  const response = await axiosClient.get('/orders');
  return response.data;
}

export async function updateOrderStatus(orderId, status) {
  if (USE_MOCK) {
    await delay(400);

    mockOrders = mockOrders.map((order) =>
      order.orderId === orderId ? { ...order, status } : order,
    );

    return mockOrders.find((order) => order.orderId === orderId);
  }

  const response = await axiosClient.patch(`/orders/${orderId}`, { status });
  return response.data;
}
