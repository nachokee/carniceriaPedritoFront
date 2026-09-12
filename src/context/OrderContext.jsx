import { createContext, useContext, useState } from 'react';

// Un Context es una "caja" de datos que cualquier componente de adentro puede leer,
// sin tener que ir pasando props de padre a hijo en cada nivel.
const OrderContext = createContext(null);

export function OrderProvider({ children }) {
  // El pedido es una lista de items: { productId, name, price, unit, quantity }
  const [items, setItems] = useState([]);

  // Ojo: siempre usamos la forma setItems((current) => ...) y devolvemos un array
  // NUEVO en lugar de modificar el que ya existe. React compara por referencia,
  // así que si mutamos el array original no se entera de que cambió.
  function addItem(product) {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);

      // Si el producto ya está en el pedido, solo le sumamos 1 a la cantidad.
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      // Si no está, lo agregamos al final con cantidad 1.
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
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
        item.productId === productId ? { ...item, quantity } : item,
      ),
    );
  }

  function clearOrder() {
    setItems([]);
  }

  // Estos dos se recalculan en cada render a partir de items, así que nunca
  // quedan desactualizados.
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
