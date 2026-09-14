# Tests

Dos tipos de test, que se corren por separado y sirven para cosas distintas.

| | Unitarios y de componentes | De punta a punta (e2e) |
| --- | --- | --- |
| Herramienta | Vitest + Testing Library | Playwright |
| Qué hacen | Montan una función o una pantalla sola, en memoria | Abren un Chrome de verdad y usan la app entera |
| Cuánto tardan | Segundos | Medio minuto |
| Dónde viven | Al lado del código: `src/format.test.js` | En `e2e/` |
| Comando | `npm test` | `npm run test:e2e` |

> **Todo corre contra los mocks** (`USE_MOCK_*` en `true`, que es el valor por
> defecto de [`src/config.js`](src/config.js)). No hace falta tener el backend
> levantado, ni base de datos, ni internet. Cuando los microservicios estén
> andando habrá que revisar los e2e: ver [Cuando el backend sea real](#cuando-el-backend-sea-real).

---

## Correr los tests

### Unitarios y de componentes

```bash
npm test            # los corre una vez y termina (es lo que se usa en CI)
npm run test:watch  # se queda mirando los archivos y los vuelve a correr al guardar
```

`npm run test:watch` es el que conviene mientras programás: cambiás un archivo y
en un segundo sabés si rompiste algo.

Para correr un archivo solo:

```bash
npx vitest run src/context/OrderContext.test.jsx
```

### De punta a punta

La primera vez hay que bajar el navegador que usa Playwright (son unos 150 MB,
se hace una sola vez por computadora):

```bash
npx playwright install chromium
```

Después:

```bash
npm run test:e2e        # los corre en segundo plano, sin ventana
npm run test:e2e:ui     # abre una ventana donde se ven los pasos uno por uno
```

`npm run test:e2e:ui` es **la mejor forma de entender qué hace un test**: se ve
el navegador, cada clic y qué había en pantalla en cada momento.

No hace falta levantar `npm run dev` antes: Playwright arranca el servidor solo
y lo apaga al terminar. Si ya lo tenés abierto en otra terminal, lo reusa.

Si algo falla, queda un reporte con capturas de pantalla:

```bash
npx playwright show-report
```

---

## Qué está cubierto

No se busca cubrir el 100% del código, sino **lo que rompería la app si se
rompiera**: las cuentas de plata y el camino de la compra.

### Unitarios (`npm test`)

| Archivo | Qué prueba |
| --- | --- |
| `src/context/OrderContext.test.jsx` | El carrito: agregar, sumar cantidad, topear al stock, quitar, vaciar y **el cálculo del total** |
| `src/api/catalogApi.test.js` | Los mocks del catálogo: listar, el **cálculo del descuento** de las ofertas, y que descontar stock no deje números en negativo ni descuente a medias si falla |
| `src/format.test.js` | Que los precios se vean `$ 8.900` y las fechas `8 sept 2026`, y que nunca aparezca `$ NaN` ni `Invalid Date` |
| `src/pages/ProductList.test.jsx` | El catálogo: que muestre los productos, que el buscador y el filtro por categoría filtren (y se combinen), y que "Agregar al pedido" mande el producto correcto al carrito |
| `src/pages/OrderSummary.test.jsx` | El carrito en pantalla: los items, el total, y que quitar un producto o cambiar su cantidad actualice todo |

### De punta a punta (`npm run test:e2e`)

Todos en [`e2e/compra.spec.js`](e2e/compra.spec.js):

1. **El camino feliz completo**: entrar a la home → "Ver catálogo" → login →
   agregar dos productos → revisar el pedido → checkout → pagar con tarjeta →
   ver la confirmación con el número de pedido y el total correcto.
2. **Pago rechazado**: con una tarjeta terminada en 0, aparece el error y
   **el carrito no se vacía**, para poder reintentar.
3. **Historial de pedidos**: "Mis pedidos" muestra los pedidos del cliente.
4. **Categorías desde la home**: la tarjeta de categoría lleva al catálogo
   filtrado.

> Estos tests ya sirvieron para algo: el primero encontró un bug real en
> `CheckoutPage`. Al terminar de pagar, la pantalla navegaba a la confirmación y
> vaciaba el carrito casi al mismo tiempo, y el chequeo de "carrito vacío"
> alcanzaba a dispararse y mandaba a `/pedido`. La compra se hacía igual, pero
> la persona nunca veía el "¡Gracias por tu compra!". Está arreglado con la
> bandera `compraTerminada`.

---

## Cosas que conviene saber

### Los datos de prueba salen de los mocks

- **Login**: cualquier email *sin* la palabra "admin" entra como cliente (Juan
  Pérez). Con "admin" adentro, entra como administrador. La contraseña no se
  valida, pero el formulario pide 6 caracteres como mínimo.
- **Pago**: cualquier tarjeta **terminada en 0** sale rechazada; el resto se
  aprueba.
- **Demoras**: los mocks esperan a propósito (800 ms al crear el pedido,
  1200 ms al cobrar) para que se vean los estados de "cargando". Por eso los
  e2e tardan lo que tardan.

### El historial no muestra la compra que acabás de hacer

El mock de `submitOrder` devuelve un pedido nuevo pero **no lo guarda** en su
lista, así que "Mis pedidos" siempre muestra los tres pedidos de siempre. No es
un bug de la app: es hasta dónde llega el mock. Con `order-service` real se
arregla solo.

### No edites archivos mientras corren los e2e

Playwright usa el servidor de desarrollo, y ese servidor recarga la página sola
cuando guardás un archivo. Si eso pasa en medio de un test, el formulario que
estaba completo se vacía y el test falla por algo que no tiene nada que ver.

Si un e2e falla de una forma rarísima (campos vacíos, un botón que quedó
"cargando" para siempre), fijate si no guardaste algo mientras corría, y volvé
a correrlo.

### Los tests de componentes no cargan los estilos de Mantine

En los tests unitarios no hay CSS. Por eso, para elegir una opción del
desplegable de categorías hay que buscarla con `{ hidden: true }`: sin los
estilos, la herramienta cree que la lista desplegada sigue escondida. Está
comentado en el test.

### Por qué `catalogApi.test.js` recarga el módulo en cada test

La lista de productos del mock vive dentro del módulo y algunas funciones la
modifican (descontar stock, crear, borrar). Si se importara una sola vez, un
test le dejaría el inventario cambiado al siguiente. Por eso cada test lo vuelve
a cargar de cero con `vi.resetModules()`.

---

## Cuando el backend sea real

Los e2e pegan contra lo que devuelva la app, así que **van a seguir sirviendo**,
pero hay que tener en cuenta:

- Los tests dan por sentados los datos del mock (que existe "Asado de tira",
  que el cliente tiene 3 pedidos, que la tarjeta terminada en 0 se rechaza).
  Con datos reales esas suposiciones se caen.
- Lo más sano es dejar los e2e corriendo **siempre mockeados** (que es lo que
  hacen hoy) y probar el backend real a mano con la checklist de
  [MIGRATION.md](MIGRATION.md). Así los tests siguen siendo rápidos y no fallan
  porque alguien cambió un precio en la base.
- Si en algún momento se quieren e2e contra el backend real, conviene un archivo
  aparte (`e2e/real.spec.js`) y un `.env` propio, sin tocar estos.
