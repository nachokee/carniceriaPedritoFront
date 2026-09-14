import axiosClient from './axiosClient';
import { USE_MOCK_CATALOG } from '../config';
import { toNumber, unwrapList } from './normalize';

// El flag vive en src/config.js (se puede pisar con VITE_USE_MOCK_CATALOG en .env).
// En true devolvemos datos falsos; en false pegamos contra catalog-service.

// let y no const: las funciones de admin reemplazan esta lista durante la
// sesión. Los cambios se pierden al recargar la página, que es lo esperable
// de un mock (no hay base de datos atrás).
let mockProducts = [
  { id: 1, name: 'Asado de tira', price: 8900, unit: 'kg', stock: 25 },
  { id: 2, name: 'Vacío', price: 9500, unit: 'kg', stock: 12 },
  { id: 3, name: 'Bife de chorizo', price: 11200, unit: 'kg', stock: 8 },
  { id: 4, name: 'Pollo entero', price: 4500, unit: 'kg', stock: 30 },
  // Stock bajo a propósito, para probar el aviso de "no hay más".
  { id: 5, name: 'Chorizo criollo', price: 6800, unit: 'kg', stock: 2 },
  // En cero a propósito, para ver la tarjeta agotada.
  { id: 6, name: 'Milanesas de ternera', price: 10400, unit: 'kg', stock: 0 },
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
    // Si el backend NO manda stock, lo dejamos en undefined a propósito: eso
    // significa "sin control de stock" y la UI no bloquea nada. Si lo
    // pusiéramos en 0, la tienda entera se vería agotada.
    stock:
      product.stock === undefined || product.stock === null
        ? undefined
        : toNumber(product.stock),
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

// Descuenta el stock de un pedido confirmado.
// items: [{ productId, quantity }]
export async function decreaseStock(items) {
  if (USE_MOCK_CATALOG) {
    await delay(400);

    // Primero revisamos TODO y recién después descontamos. Si no, podríamos
    // descontar la mitad del pedido y cortar al llegar al producto sin stock,
    // dejando el inventario inconsistente.
    for (const item of items) {
      const product = mockProducts.find((p) => p.id === item.productId);

      if (!product) {
        throw new Error("El producto #" + item.productId + " ya no está disponible.");
      }

      if (product.stock < item.quantity) {
        throw new Error(
          "No hay stock suficiente de " + product.name + ": quedan " +
            product.stock + " " + product.unit + ".",
        );
      }
    }

    mockProducts = mockProducts.map((product) => {
      const item = items.find((i) => i.productId === product.id);

      if (!item) {
        return product;
      }

      // Math.max evita que quede en negativo por las dudas.
      return { ...product, stock: Math.max(0, product.stock - item.quantity) };
    });

    return [...mockProducts];
  }

  // OJO: endpoint tentativo, hay que confirmarlo con el backend. Otra opción
  // razonable es que el order-service descuente el stock solo al confirmar el
  // pedido y que el front no llame a nada.
  const response = await axiosClient.post('/products/decrease-stock', { items });
  return unwrapList(response.data).map(normalizeProduct);
}
