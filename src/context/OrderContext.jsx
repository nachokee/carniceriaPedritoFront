import { createContext, useContext, useEffect, useState } from 'react';
import { getProducts } from '../api/catalogApi';
import { getDisplayPrice } from '../pricing';

// Un Context es una "caja" de datos que cualquier componente de adentro puede leer,
// sin tener que ir pasando props de padre a hijo en cada nivel.
const OrderContext = createContext(null);

// Clave con la que guardamos el pedido en localStorage (el "cajón" del navegador
// que sobrevive a un F5). Mismo criterio que AuthContext, que guarda la sesión
// bajo 'auth'.
const STORAGE_KEY = 'carniceria_cart';

// Recorta una cantidad al stock disponible.
// Si stock es undefined (el backend no controla stock), no toca nada.
function clampToStock(quantity, stock) {
  if (typeof stock !== 'number') {
    return quantity;
  }

  return Math.min(quantity, stock);
}

// --- Guardar y recuperar el pedido del navegador ---

// ¿Esto que salió de localStorage tiene forma de item del pedido? Alcanza con
// mirar lo que usan las pantallas: sin productId no se puede ni borrar ni sumar,
// y sin precio o cantidad el total daría NaN y se vería "$ NaN" en toda la app.
function isValidItem(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    item.productId !== undefined &&
    Number.isFinite(item.price) &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0
  );
}

// Lee el pedido guardado. Si no hay nada, o quedó algo roto, arranca vacío:
// perder el carrito es molesto, pero mucho menos que una pantalla en blanco.
function readStoredItems() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    // Si alguien editó el localStorage a mano y dejó cualquier otra cosa
    // (un objeto, un número), no intentamos adivinar.
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Filtramos item por item: si una sola fila quedó rota, se pierde esa y no
    // el pedido entero.
    return parsed.filter(isValidItem);
  } catch {
    return [];
  }
}

// Guarda el pedido. El try/catch es por los casos en que el navegador no deja
// escribir: modo incógnito con storage bloqueado, cuota llena, o el usuario que
// deshabilitó las cookies. En todos, el carrito sigue funcionando en memoria y
// lo único que se pierde es que sobreviva al refresh: no vale la pena cortar
// una compra por eso.
function saveItems(items) {
  try {
    // Carrito vacío = no guardamos nada. Así un pedido ya comprado (clearOrder)
    // no queda dando vueltas en el navegador esperando a la próxima visita.
    if (items.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // A propósito vacío: ver el comentario de arriba.
  }
}

// Revisa el pedido restaurado contra el catálogo de hoy. Entre que la persona
// cargó el carrito y volvió pudo pasar cualquier cosa: que el admin borre un
// producto, o que se venda casi todo el stock.
//
// Lo que NO tocamos es el precio: el del carrito es el que se congeló al
// agregar el producto (con su descuento, si tenía). Mismo criterio que addItem.
function reconcileWithCatalog(items, products) {
  // flatMap con [] adentro es la forma corta de "filtrar y transformar a la
  // vez": devolver [] saca el item, devolver [algo] lo deja.
  return items.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId);

    // Ya no está en el catálogo: lo sacamos sin avisar, en vez de mostrar una
    // fila de un producto que no se puede comprar.
    if (!product) {
      return [];
    }

    // El backend no controla stock: la cantidad queda como estaba.
    if (typeof product.stock !== 'number') {
      return [{ ...item, stock: product.stock }];
    }

    // Se quedó sin stock mientras el carrito esperaba: también se va.
    if (product.stock === 0) {
      return [];
    }

    return [
      {
        ...item,
        // Refrescamos la foto del stock para que el tope del carrito sea el de
        // hoy y no el del día que se agregó.
        stock: product.stock,
        // Si quedaban 2 kg y el carrito pedía 5, se lleva 2.
        quantity: Math.min(item.quantity, product.stock),
      },
    ];
  });
}

export function OrderProvider({ children }) {
  // El pedido es una lista de items: { productId, name, price, unit, quantity }
  //
  // Pasarle una FUNCIÓN a useState hace que se ejecute una sola vez, en el
  // primer render. Así el carrito que quedó de la visita anterior ya está
  // puesto en el primer dibujo, sin parpadeo. Es el mismo truco que usa
  // AuthContext para rehidratar la sesión.
  const [items, setItems] = useState(readStoredItems);

  // Cada vez que cambia el pedido lo guardamos. Con un efecto y no adentro de
  // cada función (addItem, removeItem, updateQuantity, clearOrder) porque todas
  // usan la forma setItems((current) => ...): el array nuevo recién existe acá.
  // Una sola línea cubre los cuatro casos y no hay forma de olvidarse de uno.
  useEffect(() => {
    saveItems(items);
  }, [items]);

  // Al montar, una sola vez: revisamos contra el catálogo lo que se restauró.
  useEffect(() => {
    // Con el carrito vacío no hay nada que revisar, y así el visitante que
    // entra a la home o al login no dispara un pedido al catálogo de gusto.
    if (items.length === 0) {
      return;
    }

    // cancelled: si el provider se desmonta antes de que llegue la respuesta,
    // no intentamos actualizar un componente que ya no existe.
    let cancelled = false;

    getProducts()
      .then((products) => {
        if (!cancelled) {
          // Forma funcional a propósito: si la persona agregó algo mientras el
          // catálogo viajaba, reconciliamos sobre lo último que hay en el
          // carrito y no sobre la foto del montaje.
          setItems((current) => reconcileWithCatalog(current, products));
        }
      })
      .catch(() => {
        // Si el catálogo no responde dejamos el carrito como estaba: es mejor
        // uno viejo que uno vacío. El control que vale igual es el del backend
        // al confirmar el pedido.
      });

    return () => {
      cancelled = true;
    };
    // Sin dependencias: esto corre solo al montar. items acá es exactamente lo
    // que se restauró de localStorage.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ojo: siempre usamos la forma setItems((current) => ...) y devolvemos un array
  // NUEVO en lugar de modificar el que ya existe. React compara por referencia,
  // así que si mutamos el array original no se entera de que cambió.
  function addItem(product) {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);

      // Si el producto ya está en el pedido, solo le sumamos 1 a la cantidad
      // (sin pasarnos del stock).
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: clampToStock(item.quantity + 1, product.stock),
              }
            : item,
        );
      }

      // Sin stock no se agrega nada. La pantalla ya deshabilita el botón, esto
      // es una segunda barrera por las dudas.
      if (product.stock === 0) {
        return current;
      }

      // Si no está, lo agregamos al final con cantidad 1.
      //
      // El precio que guardamos es el que se cobra: si el producto está en
      // oferta, el de la oferta. Antes guardábamos product.price y el cliente
      // veía "-15%" en la vidriera pero pagaba el precio de lista.
      //
      // Ojo con el detalle de arriba: cuando el producto YA estaba en el
      // pedido solo le sumamos cantidad y no tocamos el precio. Es a propósito.
      // Así, si el precio del catálogo cambia mientras la persona compra, lo
      // que ya tenía en el carrito sigue valiendo lo mismo.
      const { price } = getDisplayPrice(product);

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          price,
          unit: product.unit,
          // Guardamos una foto del stock al momento de agregarlo, para poder
          // topear la cantidad en el carrito sin volver a pedir el producto.
          // El control que vale es el del backend al confirmar el pedido.
          stock: product.stock,
          quantity: 1,
        },
      ];
    });
  }

  function removeItem(productId) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  function updateQuantity(productId, quantity) {
    // Cantidad 0 o negativa = sacar el producto del pedido.
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: clampToStock(quantity, item.stock) }
          : item,
      ),
    );
  }

  // Se llama cuando la compra terminó bien (CheckoutPage). Vaciar el estado
  // alcanza: el efecto de arriba ve la lista vacía y borra la clave de
  // localStorage, así el pedido ya comprado no reaparece en la próxima visita.
  function clearOrder() {
    setItems([]);
  }

  // Estos dos se recalculan en cada render a partir de items, así que nunca
  // quedan desactualizados.
  //
  // item.price es el precio que se congeló al agregar el producto (con
  // descuento si correspondía), no el del catálogo: acá NO se vuelve a aplicar
  // ninguna oferta. Lo mismo hacen OrderItemsList y CheckoutPage, así el total
  // que se ve en el carrito, en el checkout y en la confirmación es el mismo.
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.length;

  const value = {
    items,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearOrder,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

// Atajo para no repetir useContext(OrderContext) en cada pantalla.
// oxlint-disable-next-line react/only-export-components -- provider + hook juntos es el patrón habitual
export function useOrder() {
  const context = useContext(OrderContext);

  if (!context) {
    throw new Error('useOrder() se tiene que usar adentro de <OrderProvider>');
  }

  return context;
}
