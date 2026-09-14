import { expect, test } from '@playwright/test';

// Test de punta a punta del camino principal: entrar, comprar y pagar.
//
// Abre un Chrome de verdad y usa la app como la usaría un cliente. Todo corre
// contra los mocks (USE_MOCK_* en true), así que no hace falta el backend.
//
// Datos de prueba que vienen de los mocks:
// - Cualquier email SIN la palabra "admin" entra como cliente (Juan Pérez).
// - La contraseña no se valida, pero el formulario pide 6 caracteres mínimo.
// - Una tarjeta terminada en 0 sale rechazada; cualquier otra se aprueba.
const CLIENTE = { email: 'juan@mail.com', password: '123456' };

const TARJETA_OK = { numero: '4111111111111111', vencimiento: '12/28', cvv: '123' };

// Precios del catálogo mockeado, para poder calcular el total esperado.
const PRECIO_ASADO = 8900;
const PRECIO_POLLO = 4500;

// El total se muestra formateado: "$ 13.400". El espacio que mete Intl entre
// el $ y el número no es un espacio común, así que buscamos solo el número.
function comoPrecio(valor) {
  return new Intl.NumberFormat('es-AR').format(valor);
}

// --- Pasos que se repiten en varios tests ---

// Entra con el usuario cliente y deja el navegador en el catálogo.
async function iniciarSesion(page) {
  await page.getByLabel('Email').fill(CLIENTE.email);
  await page.getByLabel('Contraseña').fill(CLIENTE.password);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL('/catalogo');
}

// Busca un producto por nombre y lo agrega al pedido.
// Usamos el buscador para que quede una sola tarjeta en pantalla: así no hay
// dudas de a cuál de los ocho botones "Agregar al pedido" le estamos pegando.
async function agregarProducto(page, nombre) {
  const buscador = page.getByLabel('Buscar');

  await buscador.fill(nombre);

  const tarjeta = page.locator('.mantine-Card-root').filter({ hasText: nombre });
  await tarjeta.getByRole('button', { name: 'Agregar al pedido' }).click();

  // Dejamos el buscador limpio para el próximo producto.
  await buscador.clear();
}

test('el cliente compra dos productos y paga con tarjeta', async ({ page }) => {
  // --- 1. La pantalla de inicio ---
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Carne fresca, todos los días' }),
  ).toBeVisible();

  // "Ver catálogo" lleva al catálogo, que es privado: como todavía no hay
  // sesión, la app manda primero al login.
  await page.getByRole('link', { name: 'Ver catálogo' }).click();
  await expect(page).toHaveURL('/login');

  // --- 2. Iniciar sesión ---
  await iniciarSesion(page);

  // --- 3. Agregar dos productos al pedido ---
  await agregarProducto(page, 'Asado de tira');
  await agregarProducto(page, 'Pollo entero');

  // El globito del carrito ahora marca 2 productos distintos.
  await expect(page.getByRole('link', { name: 'Mi pedido' })).toBeVisible();

  // --- 4. Revisar el pedido ---
  await page.getByRole('link', { name: 'Mi pedido' }).click();
  await expect(page).toHaveURL('/pedido');

  await expect(page.getByText('Asado de tira')).toBeVisible();
  await expect(page.getByText('Pollo entero')).toBeVisible();

  const totalEsperado = comoPrecio(PRECIO_ASADO + PRECIO_POLLO); // 13.400
  await expect(page.getByText(totalEsperado).first()).toBeVisible();

  // --- 5. Checkout: elegir tarjeta y completar los datos ---
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();
  await expect(page).toHaveURL('/checkout');

  await page.getByRole('radio', { name: 'Tarjeta' }).check();

  await page.getByLabel('Número de tarjeta').fill(TARJETA_OK.numero);
  await page.getByLabel('Vencimiento').fill(TARJETA_OK.vencimiento);
  await page.getByLabel('CVV').fill(TARJETA_OK.cvv);

  // --- 6. Pagar ---
  // Acá se encadenan tres llamadas mockeadas (crear pedido, descontar stock y
  // cobrar), que juntas tardan unos 2,4 segundos. Los expect de Playwright
  // esperan solos, no hace falta poner pausas.
  await page.getByRole('button', { name: 'Confirmar y pagar' }).click();

  // --- 7. La confirmación ---
  await expect(page).toHaveURL('/order-confirmation');

  await expect(
    page.getByRole('heading', { name: '¡Gracias por tu compra!' }),
  ).toBeVisible();

  // Número de pedido: el mock siempre devuelve "mock-123".
  await expect(page.getByText(/Pedido número #/)).toBeVisible();
  await expect(page.getByText(/mock-123/)).toBeVisible();

  // Y el total que se pagó es el mismo que mostraba el carrito.
  await expect(page.getByText(totalEsperado).first()).toBeVisible();

  // El resumen muestra los dos productos comprados.
  await expect(page.getByText('Asado de tira')).toBeVisible();
  await expect(page.getByText('Pollo entero')).toBeVisible();
});

test('una tarjeta rechazada no rompe el pedido', async ({ page }) => {
  // El otro camino que importa: si el pago falla, el carrito NO se vacía, para
  // que la persona pueda reintentar con otro medio de pago.
  await page.goto('/login');
  await iniciarSesion(page);

  await agregarProducto(page, 'Pollo entero');

  await page.getByRole('link', { name: 'Mi pedido' }).click();
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();

  await page.getByRole('radio', { name: 'Tarjeta' }).check();

  // El mock rechaza cualquier tarjeta terminada en 0.
  await page.getByLabel('Número de tarjeta').fill('4111111111111110');
  await page.getByLabel('Vencimiento').fill(TARJETA_OK.vencimiento);
  await page.getByLabel('CVV').fill(TARJETA_OK.cvv);

  await page.getByRole('button', { name: 'Confirmar y pagar' }).click();

  // Se ve el aviso de rechazo…
  await expect(page.getByText('No se pudo completar la compra')).toBeVisible();

  // …seguimos en el checkout, con el pedido intacto.
  await expect(page).toHaveURL('/checkout');
  await expect(page.getByText('Pollo entero')).toBeVisible();
});

test('el historial de pedidos muestra los pedidos del cliente', async ({ page }) => {
  await page.goto('/login');
  await iniciarSesion(page);

  await page.getByRole('link', { name: 'Mis pedidos' }).click();
  await expect(page).toHaveURL('/mis-pedidos');

  // La tabla no muestra el número de pedido: muestra fecha, total, estado y el
  // botón de la factura. Así que contamos las filas (el mock trae 3 pedidos
  // para este cliente) y miramos que estén los estados.
  //
  // OJO: la compra que hace el primer test NO aparece acá. El mock de
  // submitOrder devuelve un pedido nuevo pero no lo guarda en su lista, así
  // que el historial siempre muestra los tres de siempre. Cuando order-service
  // sea real esto se arregla solo. Ver TESTING.md.
  await expect(page.getByRole('row')).toHaveCount(4); // 3 pedidos + el encabezado

  await expect(page.getByText('entregado')).toBeVisible();
  await expect(page.getByText('pendiente')).toBeVisible();

  // Cada fila tiene su botón para ver la factura.
  await expect(page.getByRole('link', { name: 'Ver factura' })).toHaveCount(3);
});

test('las categorías de la pantalla de inicio filtran el catálogo', async ({ page }) => {
  // La tarjeta de categoría linkea a /catalogo?category=Pollo. Como el catálogo
  // es privado, primero pasa por el login; después de entrar tiene que quedar
  // en el catálogo.
  await page.goto('/');

  // exact: true es necesario. Sin eso, "Pollo" también matchearía la tarjeta
  // de la oferta de "Pollo entero", y Playwright corta cuando un locator
  // encuentra más de un elemento (para que el test no dependa del azar).
  await page.getByRole('link', { name: 'Pollo', exact: true }).click();
  await expect(page).toHaveURL('/login');

  await iniciarSesion(page);

  // Entramos directo por la URL con el filtro puesto, que es lo que hace el
  // link de la home cuando ya hay sesión.
  await page.goto('/catalogo?category=Pollo');

  await expect(page.getByText('Pollo entero')).toBeVisible();
  // Un producto de otra categoría no tiene que estar.
  await expect(page.getByText('Asado de tira')).toHaveCount(0);
});
