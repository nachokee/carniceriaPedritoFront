# carniceriaPedritoFront

Frontend de la carnicería: aplicación React + Vite con [Mantine](https://mantine.dev) UI.

Cubre el circuito completo con **datos mockeados**, para poder trabajar el front
antes de que existan los microservicios del backend.

## Cómo correrlo

```bash
npm install
npm run dev
```

Usuarios de prueba (la contraseña no se valida mientras esté mockeado):

- **Cliente**: cualquier email, por ejemplo `juan@mail.com`
- **Admin**: cualquier email que contenga `admin`, por ejemplo `admin@carniceria.com`

## Pantallas

- **Cliente**: catálogo, carrito, login/registro, checkout con pago, factura
  imprimible e historial de pedidos.
- **Admin**: alta/edición/baja de productos y gestión de estados de pedidos.

## Tests

```bash
npm test          # unitarios y de componentes (Vitest + Testing Library)
npm run test:e2e  # de punta a punta (Playwright) — la primera vez: npx playwright install chromium
```

Los dos corren contra los mocks (`USE_MOCK_*` en `true`), así que no hace falta
tener el backend levantado. Los detalles están en [TESTING.md](TESTING.md).

## Migración al backend

Cada archivo de `src/api/` tiene un flag `USE_MOCK` (hoy en `true`) y la llamada
axios real ya escrita. A medida que cada microservicio esté disponible, alcanza
con poner el flag en `false`:

| Archivo | Servicio | Endpoints |
| --- | --- | --- |
| `authApi.js` | auth-service | `POST /auth/login`, `/auth/register`, `/auth/logout` |
| `catalogApi.js` | catalog-service | `GET/POST/PUT/DELETE /products` |
| `orderApi.js` | order-service | `GET/POST /orders`, `PATCH /orders/:id` |
| `paymentApi.js` | payment-service | `POST /payments` |
| `invoiceApi.js` | invoice-service | `GET /invoices/:orderId` |

La URL del backend se configura con `VITE_API_URL` (ver `.env.example`).

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run lint` — oxlint
- `npm test` — tests unitarios y de componentes (una vez)
- `npm run test:watch` — los mismos, quedándose a mirar los archivos
- `npm run test:e2e` — tests de punta a punta
- `npm run test:e2e:ui` — los e2e con ventana, para verlos paso a paso
