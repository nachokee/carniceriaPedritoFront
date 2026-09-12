import axiosClient from './axiosClient';

// Mientras no exista el catalog-service, trabajamos con datos de prueba.
// Cuando el backend esté listo, poner USE_MOCK en false (o borrar el flag).
const USE_MOCK = true;

// let y no const: las funciones de admin reemplazan esta lista durante la
// sesión. Los cambios se pierden al recargar la página, que es lo esperable
// de un mock (no hay base de datos atrás).
let mockProducts = [
  { id: 1, name: 'Asado de tira', price: 8900, unit: 'kg' },
  { id: 2, name: 'Vacío', price: 9500, unit: 'kg' },
  { id: 3, name: 'Bife de chorizo', price: 11200, unit: 'kg' },
  { id: 4, name: 'Pollo entero', price: 4500, unit: 'kg' },
  { id: 5, name: 'Chorizo criollo', price: 6800, unit: 'kg' },
  { id: 6, name: 'Milanesas de ternera', price: 10400, unit: 'kg' },
];

// Para darle un id nuevo a cada producto creado.
let nextId = 7;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getProducts() {
  if (USE_MOCK) {
    // Devolvemos una COPIA del array, no el original. Si devolviéramos siempre
    // el mismo array, React vería la misma referencia al volver a cargar la
    // lista y no redibujaría la tabla después de crear o borrar un producto.
    return [...mockProducts];
  }

  const response = await axiosClient.get('/products');
  return response.data;
}

// --- Funciones de administración ---

export async function createProduct(product) {
  if (USE_MOCK) {
    await delay(400);

    const created = { id: nextId, ...product };
    nextId = nextId + 1;

    mockProducts = [...mockProducts, created];
    return created;
  }

  const response = await axiosClient.post('/products', product);
  return response.data;
}

export async function updateProduct(id, updates) {
  if (USE_MOCK) {
    await delay(400);

    // map arma una lista nueva: al producto que coincide le pisamos los campos
    // que vienen en updates, y el resto queda igual.
    mockProducts = mockProducts.map((product) =>
      product.id === id ? { ...product, ...updates } : product,
    );

    return mockProducts.find((product) => product.id === id);
  }

  const response = await axiosClient.put(`/products/${id}`, updates);
  return response.data;
}

export async function deleteProduct(id) {
  if (USE_MOCK) {
    await delay(400);

    mockProducts = mockProducts.filter((product) => product.id !== id);
    return;
  }

  await axiosClient.delete(`/products/${id}`);
}
