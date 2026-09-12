import axiosClient from './axiosClient';
import { USE_MOCK_CATALOG } from '../config';
import { toNumber, unwrapList } from './normalize';

// El flag vive en src/config.js (se puede pisar con VITE_USE_MOCK_CATALOG en .env).
// En true devolvemos datos falsos; en false pegamos contra catalog-service.

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

// Deja cada producto con la forma { id, name, price, unit } que usan las
// pantallas, sin importar cómo lo serialice el backend.
function normalizeProduct(product) {
  return {
    id: product.id,
    name: product.name,
    // price puede venir como el string '8900.00' (BigDecimal de Java).
    price: toNumber(product.price),
    // Si el backend no maneja unidades, asumimos kg (es una carnicería).
    unit: product.unit ?? 'kg',
  };
}

export async function getProducts() {
  if (USE_MOCK_CATALOG) {
    // Devolvemos una COPIA del array, no el original. Si devolviéramos siempre
    // el mismo array, React vería la misma referencia al volver a cargar la
    // lista y no redibujaría la tabla después de crear o borrar un producto.
    return [...mockProducts];
  }

  const response = await axiosClient.get('/products');

  // unwrapList: si Spring lo devuelve paginado ({ content: [...] }), saca el array.
  return unwrapList(response.data).map(normalizeProduct);
}

// --- Funciones de administración ---

export async function createProduct(product) {
  if (USE_MOCK_CATALOG) {
    await delay(400);

    const created = { id: nextId, ...product };
    nextId = nextId + 1;

    mockProducts = [...mockProducts, created];
    return created;
  }

  const response = await axiosClient.post('/products', product);
  return normalizeProduct(response.data);
}

export async function updateProduct(id, updates) {
  if (USE_MOCK_CATALOG) {
    await delay(400);

    // map arma una lista nueva: al producto que coincide le pisamos los campos
    // que vienen en updates, y el resto queda igual.
    mockProducts = mockProducts.map((product) =>
      product.id === id ? { ...product, ...updates } : product,
    );

    return mockProducts.find((product) => product.id === id);
  }

  const response = await axiosClient.put(`/products/${id}`, updates);
  return normalizeProduct(response.data);
}

export async function deleteProduct(id) {
  if (USE_MOCK_CATALOG) {
    await delay(400);

    mockProducts = mockProducts.filter((product) => product.id !== id);
    return;
  }

  await axiosClient.delete(`/products/${id}`);
}
