import { createContext, useContext, useState } from 'react';
import { getDisplayPrice } from '../pricing';

// Un Context es una "caja" de datos que cualquier componente de adentro puede leer,
// sin tener que ir pasando props de padre a hijo en cada nivel.
const OrderContext = createContext(null);

// Recorta una cantidad al stock disponible.
// Si stock es undefined (el backend no controla stock), no toca nada.
function clampToStock(quantity, stock) {
  if (typeof stock !== 'number') {
    return quantity;
  }

  return Math.min(quantity, stock);
}

export function OrderProvider({ children }) {
  // El pedido es una lista de items: { productId, name, price, unit, quantity }
  const [items, setItems] = useState([]);

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
