# Migración de mocks a los microservicios reales

Guía para ir pasando el frontend de datos falsos al backend real, **un servicio
por vez**, sin que la app deje de funcionar en el medio.

---

## 0. Cómo se prende y se apaga cada mock

Los flags viven en [`src/config.js`](src/config.js), uno por servicio:

```js
export const USE_MOCK_AUTH = readFlag(import.meta.env.VITE_USE_MOCK_AUTH);
export const USE_MOCK_CATALOG = readFlag(import.meta.env.VITE_USE_MOCK_CATALOG);
export const USE_MOCK_ORDERS = readFlag(import.meta.env.VITE_USE_MOCK_ORDERS);
export const USE_MOCK_PAYMENTS = readFlag(import.meta.env.VITE_USE_MOCK_PAYMENTS);
export const USE_MOCK_INVOICES = readFlag(import.meta.env.VITE_USE_MOCK_INVOICES);
```

Todos arrancan en `true`. Para pasar un servicio a real, en tu `.env` local
(copiado de `.env.example`, **no se sube al repo**):

```bash
VITE_API_URL=http://localhost:8080/api
VITE_USE_MOCK_AUTH=false     # ← este servicio ya pega contra el backend
VITE_USE_MOCK_CATALOG=true   # ← estos siguen mockeados
```

> **Hay que reiniciar `npm run dev`** después de tocar el `.env`: Vite lee las
> variables al arrancar, no en caliente.

**No borres los mocks** (`mockProducts`, `mockCustomer`, `mockOrders`, etc.)
después de migrar. Son unas pocas líneas de código muerto que te salvan el día
cuando el backend se cae, cuando hay que mostrar la app en una demo sin levantar
cinco servicios, o cuando querés aislar si un bug es del front o del back: ponés
el flag en `true` y seguís trabajando.

---

## 1. Orden recomendado

```
auth-service → catalog-service → order-service → payment-service → invoice-service
```

**Por qué ese orden:**

1. **auth-service primero, sí o sí.** El `axiosClient` manda
   `Authorization: Bearer <token>` en *todas* las llamadas, y hoy ese token es
   el texto `'mock-token-123'`. Apenas Spring Security esté activo en cualquier
   otro servicio, ese token falso va a dar **401**, y el interceptor de
   `axiosClient.js` borra la sesión y te patea al login. Migrar cualquier otro
   servicio antes que auth deja la app inusable.
2. **catalog-service después**: son GET de solo lectura, los más fáciles de
   verificar a ojo. Y el `id`, `price` y `unit` del producto viajan al carrito,
   al pedido y a la factura — conviene que esos campos estén firmes antes de
   seguir.
3. **order-service**: necesita `userId` real (de auth) y `productId` reales (de
   catalog).
4. **payment-service**: necesita un `orderId` real que exista en la base.
5. **invoice-service al final**: necesita un pedido pagado de verdad.

---

## 2. Antes de tocar ningún flag

Los mocks nunca salieron a la red, así que estas tres cosas jamás se probaron.
Si algo falla apenas prendés el primer servicio, es casi seguro una de estas.

### 2.1 `baseURL` y el gateway

`src/config.js` define una **sola** URL base para los cinco servicios:

```js
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
```

Eso asume que hay un **API gateway** adelante (Spring Cloud Gateway) que rutea
`/products` → catalog-service, `/orders` → order-service, etc.

Si no hay gateway y cada servicio escucha en su propio puerto (8081, 8082…), hay
dos caminos:

- **Recomendado:** levantar el gateway. El front no se toca.
- **Alternativa:** una instancia de axios por servicio. Implica partir
  `axiosClient.js` en varios y repetir los interceptores en cada uno.

**Preguntar a Persona 1:** ¿hay gateway? ¿en qué puerto? ¿los paths llevan
prefijo `/api`?

### 2.2 CORS

El navegador va a bloquear las llamadas hasta que Spring permita el origen del
front. En cada servicio (o en el gateway):

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173", "http://localhost:5174")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                .allowedHeaders("*");
    }
}
```

Ojo con el puerto: si el 5173 está ocupado, Vite usa el 5174. Conviene permitir
los dos.

### 2.3 El token

Ya está cableado en [`src/api/axiosClient.js`](src/api/axiosClient.js), no hay
que escribir nada nuevo — pero conviene entender qué manda:

```js
function getStoredToken() {
  const stored = localStorage.getItem('auth');   // lo escribe AuthContext
  return stored ? JSON.parse(stored).token : null;
}

axiosClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

Y qué hace ante un rechazo:

```js
if (error.response?.status === 401) {
  localStorage.removeItem('auth');   // borra la sesión
  window.location.href = '/login';   // y te saca
}
```

**Preguntar a Persona 1:** ¿el header es `Authorization: Bearer <jwt>`? ¿el JWT
tiene expiración corta? Si expira en minutos vamos a necesitar refresh token,
que hoy el front no maneja.

---

## 3. auth-service

**Flag:** `VITE_USE_MOCK_AUTH=false` · **Archivo:** `src/api/authApi.js`

### Lo que el front espera hoy

| Función | Método y URL | Payload |
| --- | --- | --- |
| `login` | `POST /auth/login` | `{ email, password }` |
| `register` | `POST /auth/register` | `{ name, email, password }` |
| `logout` | `POST /auth/logout` | — |

Respuesta esperada en login y register (`response.data`):

```json
{
  "user": { "id": 1, "name": "Juan Pérez", "email": "juan@mail.com", "role": "cliente" },
  "token": "eyJhbGciOi..."
}
```

### Riesgos de desajuste

| Riesgo | Dónde explota |
| --- | --- |
| El token viene como `accessToken` o `jwt` y no como `token` | `AuthContext` guarda `undefined` → `isAuthenticated` queda en `false` y nunca entrás |
| El rol viene `"ADMIN"` o `"ROLE_ADMIN"` en vez de `"cliente"` / `"admin"` | `AuthContext.jsx`: `isAdmin: auth.user?.role === 'admin'` compara **exacto y en minúscula**. Un admin entraría como cliente |
| La respuesta viene plana (`{ id, name, email, role, token }`, sin `user` anidado) | `data.user` queda `undefined` → el navbar rompe al leer `user.name` |
| El `id` es un UUID string y no un número | No rompe nada hoy, pero `getOrdersByUser` filtra por `userId`: que el back compare el mismo tipo |

Si el back no puede cambiar, **se adapta en `authApi.js`** y ninguna pantalla se
entera:

```js
const response = await axiosClient.post('/auth/login', { email, password });

// Adaptador: dejamos la respuesta con la forma que espera el front.
return {
  user: {
    id: response.data.id,
    name: response.data.nombre,
    email: response.data.email,
    role: response.data.role.toLowerCase().replace('role_', ''),
  },
  token: response.data.accessToken,
};
```

### Checklist

- [ ] Login con usuario cliente → entra y el navbar dice "Hola, {nombre}"
- [ ] Login con usuario admin → aparece el botón "Panel admin"
- [ ] Login con contraseña incorrecta → muestra el Alert rojo, no una pantalla en blanco
- [ ] Registro de un usuario nuevo → entra directo, sin pasar por el login
- [ ] F5 en cualquier pantalla → la sesión sobrevive (sale de `localStorage`)
- [ ] "Cerrar sesión" → vuelve al login y `localStorage.auth` desaparece
- [ ] En DevTools → Network, las llamadas llevan el header `Authorization`

---

## 4. catalog-service

**Flag:** `VITE_USE_MOCK_CATALOG=false` · **Archivo:** `src/api/catalogApi.js`

### Lo que el front espera hoy

| Función | Método y URL | Payload |
| --- | --- | --- |
| `getProducts` | `GET /products` | — |
| `createProduct` | `POST /products` | `{ name, price, unit }` |
| `updateProduct` | `PUT /products/:id` | `{ name, price, unit }` |
| `deleteProduct` | `DELETE /products/:id` | — |

`getProducts` tiene que devolver un **array plano**:

```json
[ { "id": 1, "name": "Asado de tira", "price": 8900, "unit": "kg" } ]
```

### Riesgos de desajuste

| Riesgo | Dónde explota |
| --- | --- |
| **Paginación de Spring**: la respuesta viene `{ "content": [...], "totalElements": 6 }` | `products.map(...)` rompe: no es un array. **El riesgo más probable de todos** |
| El back usa nombres en castellano (`nombre`, `precio`) | La tarjeta se ve vacía y con `$undefined` |
| No existe el campo `unit` | `ProductList` y la factura imprimen "8900 / undefined" |
| `price` viene como string `"8900.00"` (BigDecimal serializado) | Los totales se rompen: `"8900.00" * 2` funciona, pero las sumas concatenan texto |
| `DELETE` devuelve 200 con body en vez de 204 | No rompe: `deleteProduct` ignora la respuesta |

Adaptador para la paginación, en `catalogApi.js`:

```js
const response = await axiosClient.get('/products');

// Si viene paginado nos quedamos con content; si no, con el array tal cual.
return Array.isArray(response.data) ? response.data : response.data.content;
```

### Checklist

- [ ] La grilla carga los productos del back, no los seis del mock
- [ ] Precio y unidad se ven bien (`$8900 / kg`, no `$undefined`)
- [ ] "Agregar al pedido" suma al carrito y el contador del navbar sube
- [ ] Admin → "Nuevo producto" → aparece en la tabla **y** en el catálogo del cliente
- [ ] Admin → editar precio → se refleja en las dos pantallas
- [ ] Admin → borrar → desaparece y el modal se cierra solo
- [ ] Recargar la página: los cambios **siguen ahí** (antes se perdían, eran memoria)

---

## 5. order-service

**Flag:** `VITE_USE_MOCK_ORDERS=false` · **Archivo:** `src/api/orderApi.js`

### Lo que el front espera hoy

| Función | Método y URL | Payload |
| --- | --- | --- |
| `submitOrder` | `POST /orders` | `{ items, userId }` |
| `getOrdersByUser` | `GET /orders?userId=1` | — |
| `getAllOrders` | `GET /orders` | — |
| `updateOrderStatus` | `PATCH /orders/:id` | `{ status }` |

Respuesta de un pedido:

```json
{
  "orderId": "mock-1",
  "userId": 1,
  "customerName": "Juan Pérez",
  "date": "2026-09-08T12:15:00Z",
  "total": 17800,
  "status": "pendiente",
  "items": [
    { "productId": 1, "name": "Asado de tira", "price": 8900, "unit": "kg", "quantity": 2 }
  ]
}
```

### Riesgos de desajuste

| Riesgo | Dónde explota |
| --- | --- |
| El back devuelve `id` y no `orderId` | `CheckoutPage` hace `order.orderId` → la URL queda `/invoice/undefined`. **Casi seguro que pasa**: en Spring/JPA la PK se llama `id` |
| El back devuelve `createdAt` y no `date` | Historial y panel admin muestran "Invalid Date" |
| Los estados son enums en MAYÚSCULA (`PENDIENTE`, `PENDING`) | `src/orderStatus.js` mapea colores por texto exacto en minúscula → todos los Badge salen grises y el `Select` del admin no matchea ningún valor |
| `getAllOrders` no trae `customerName` (solo `userId`) | La columna "Cliente" del panel admin sale vacía |
| Paginación, igual que catalog | `.sort()` rompe sobre un objeto |

### Dos cosas para acordar con Persona 1

**1. Qué mandamos en `items` al crear un pedido.** Hoy el front manda el item
completo del carrito, **precio incluido**:

```json
{ "productId": 1, "name": "Asado de tira", "price": 8900, "unit": "kg", "quantity": 2 }
```

Eso es un agujero de seguridad: cualquiera puede editar el precio desde DevTools
y comprar a $1. **El back tiene que ignorar el precio que mande el front y
buscarlo en su propia base.** Lo ideal es que el endpoint reciba solo lo mínimo,
y en ese caso el front mapea antes de enviar:

```js
const response = await axiosClient.post('/orders', {
  userId,
  items: items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  })),
});
```

**2. Quién calcula el total.** Mismo motivo: el `total` que viaja hoy lo calculó
el front. El back debería recalcularlo y devolver el suyo.

### Checklist

- [ ] Comprar algo → `POST /orders` devuelve un id **y la URL de la factura lo usa** (`/invoice/7`, no `/invoice/undefined`)
- [ ] El pedido aparece en "Mis pedidos" del cliente que lo hizo
- [ ] Un cliente **no** ve los pedidos de otro (el filtro `userId` funciona)
- [ ] Panel admin → se ven los pedidos de todos, con nombre de cliente
- [ ] Panel admin → cambiar el estado → el Badge cambia de color y sobrevive al F5
- [ ] Los estados del back coinciden con los de `src/orderStatus.js` (si no, ajustar **ese archivo**, que es el único lugar donde están)

---

## 6. payment-service

**Flag:** `VITE_USE_MOCK_PAYMENTS=false` · **Archivo:** `src/api/paymentApi.js`

### Lo que el front espera hoy

`POST /payments` con:

```json
{
  "orderId": "mock-123",
  "paymentInfo": { "method": "tarjeta", "cardNumber": "4111...", "expiry": "12/28", "cvv": "123" }
}
```

Respuesta:

```json
{ "paymentId": "pay-1", "status": "approved", "orderId": "mock-123", "message": "..." }
```

### Riesgos de desajuste

| Riesgo | Dónde explota |
| --- | --- |
| `status` viene `"APPROVED"` o `"aprobado"` | `CheckoutPage` compara `payment.status !== 'approved'` **exacto** → un pago exitoso se muestra como rechazado |
| El rechazo viene como HTTP 400 y no como 200 con `status: "rejected"` | Cae en el `catch` y se ve el mensaje genérico en vez del motivo real |
| No devuelve `message` en el rechazo | Se muestra el texto por defecto ("El pago fue rechazado…"), aceptable |

### ⚠️ Datos de tarjeta

Hoy el front manda número, vencimiento y CVV a nuestro backend. **Eso no puede
ir a producción**: recibir o guardar esos datos te mete en PCI-DSS.

Lo correcto es que la pasarela (Mercado Pago, Stripe) devuelva un **token** desde
el navegador, y al back le mandemos solo ese token:

```json
{ "orderId": 7, "paymentInfo": { "method": "tarjeta", "cardToken": "tok_abc123" } }
```

Para la entrega de la materia el flujo actual alcanza, pero vale dejarlo escrito.

### Checklist

- [ ] Pago en efectivo → aprueba y va a la confirmación
- [ ] Pago con tarjeta válida → aprueba
- [ ] Pago rechazado → se ve el Alert rojo **y el carrito no se vacía**
- [ ] Reintentar después de un rechazo → **no** crea un pedido nuevo (reusa el `orderId` guardado en el estado de `CheckoutPage`)
- [ ] El pedido queda marcado como pagado en el panel admin

---

## 7. invoice-service

**Flag:** `VITE_USE_MOCK_INVOICES=false` · **Archivo:** `src/api/invoiceApi.js`

### Lo que el front espera hoy

`GET /invoices/:orderId` →

```json
{
  "invoiceId": "inv-1",
  "orderId": 7,
  "date": "2026-09-11T14:30:00Z",
  "customer": { "name": "Juan Pérez", "email": "juan@mail.com" },
  "items": [
    { "name": "Asado de tira", "quantity": 2, "unit": "kg", "price": 8900, "subtotal": 17800 }
  ],
  "total": 17800,
  "status": "emitida"
}
```

Ojo: los items de la factura tienen **`subtotal` ya calculado** y **no** tienen
`productId`, a diferencia de los items del pedido.

### Riesgos de desajuste

| Riesgo | Dónde explota |
| --- | --- |
| La factura se genera on-demand con `POST /invoices` y no con `GET` | Hay que cambiar el método en `invoiceApi.js` (una línea) |
| `GET` devuelve 404 si la factura todavía no existe | La pantalla muestra el Alert de error. Conviene que el back la cree al pagar |
| Los items no traen `subtotal` | La columna queda vacía; se calcula en el adaptador: `price * quantity` |
| `customer` viene plano (`customerName`, `customerEmail`) | `invoice.customer.name` rompe la pantalla |

### Bonus: acá se limpia un parche

El mock de `generateInvoice` recibe un segundo parámetro `details` con los items,
porque no tiene base de datos de dónde sacarlos. Por eso
`OrderConfirmationPage` y `OrderHistoryPage` le pasan los items por el `state`
de navegación.

**Con el backend real ese parámetro se ignora solo.** Una vez migrado se puede
borrar el `state={{ items: ... }}` de los dos botones "Ver factura" y el
parámetro `details` de la firma. Beneficio concreto: la URL `/invoice/7` va a
funcionar pegándola directo en el navegador y al recargar con F5, cosa que hoy
no anda.

### Checklist

- [ ] Comprar → "Ver factura" → se ven los datos reales
- [ ] Nombre y email son los del usuario logueado
- [ ] Los subtotales y el total cierran con lo que se pagó
- [ ] "Mis pedidos" → "Ver factura" de un pedido viejo → funciona
- [ ] Pegar `/invoice/7` directo en el navegador → funciona (esto **antes fallaba**)
- [ ] "Descargar factura" abre el diálogo de impresión sin el header

---

## 8. Reglas generales

**Un servicio por vez, y probá el flujo completo después de cada uno.** El orden
está pensado para que, si algo se rompe, sepas exactamente qué flag lo causó.

**Si algo no matchea, adaptalo en el archivo `api/`, nunca en las pantallas.**
Ese es el punto de tener esta capa: hay un solo lugar donde traducir entre lo que
manda el back y lo que esperan los componentes. Si empezás a tocar
`CheckoutPage` o `ProductList` para acomodar nombres de campos, el desajuste se
te desparrama por todo el proyecto.

**Para volver atrás**, poné el flag en `true` y reiniciá el dev server. Por eso
los mocks se quedan donde están.

### Errores más probables, en orden

1. **Pantalla en blanco / error de CORS en consola** → sección 2.2
2. **`products.map is not a function`** → respuesta paginada, sección 4
3. **Te saca al login todo el tiempo** → 401: token inválido, o auth todavía mockeado mientras otro servicio ya es real
4. **`/invoice/undefined`** → el back devuelve `id` y el front busca `orderId`, sección 5
5. **Badges todos grises** → estados en MAYÚSCULA, ajustar `src/orderStatus.js`
