import { useEffect, useState } from 'react';

// Encapsula el ciclo que repetíamos en todas las pantallas que piden datos:
// "estoy cargando" → "llegó el dato" o "falló".
//
// Uso:
//   const { data, loading, error, reload } = useAsync(() => getProducts(), []);
//
// - asyncFunction: una función que devuelve una promesa.
// - deps: si alguno cambia, se vuelve a pedir (igual que en useEffect).
//   Para pedir una sola vez al montar, pasar [].
//
// Siempre devuelve la misma forma, así todas las pantallas se escriben igual.
export function useAsync(asyncFunction, deps = []) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });

  // Un contador que cambia cada vez que alguien llama a reload(). Como está en
  // la lista de dependencias del useEffect, cambiarlo vuelve a disparar el pedido.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    // cancelled evita el caso en que la persona se va de la pantalla antes de
    // que llegue la respuesta: sin esto, intentaríamos actualizar un componente
    // que ya no existe.
    let cancelled = false;

    // oxlint-disable-next-line react/set-state-in-effect -- marcar "cargando" al arrancar el pedido es justamente el trabajo de este efecto
    setState((current) => ({ ...current, loading: true, error: null }));

    asyncFunction()
      .then((data) => {
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          // Guardamos el texto, no el objeto Error: es lo que se muestra.
          setState({ data: null, loading: false, error: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
    // asyncFunction queda afuera a propósito: normalmente se escribe inline
    // (una función nueva en cada render) y la incluiríamos en un loop infinito.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  return {
    ...state,
    reload: () => setReloadToken((token) => token + 1),
  };
}
