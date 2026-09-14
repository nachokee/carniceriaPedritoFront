// Categorías posibles de un producto, en un solo lugar para que el formulario
// del admin, la tabla y el filtro del catálogo no se desincronicen.
// Si mañana hay que agregar "Achuras", se agrega ACÁ y aparece solo en las
// tres pantallas.
export const CATEGORIES = ['Vacuno', 'Cerdo', 'Pollo', 'Embutidos', 'Otros'];

// La que usamos cuando un producto no tiene categoría (productos viejos del
// mock, o un backend que todavía no manda el campo).
export const DEFAULT_CATEGORY = 'Otros';

// Valor del filtro "no filtres por categoría". Es un string común y no null
// porque el Select de Mantine trabaja más cómodo con strings.
export const ALL_CATEGORIES = 'Todas';

// Opciones para el Select del filtro: "Todas" primero y después las reales.
export const CATEGORY_FILTER_OPTIONS = [ALL_CATEGORIES, ...CATEGORIES];

// Color del Badge según la categoría. Cualquier categoría que no esté acá cae
// en gris, así nunca queda un Badge sin color.
export const CATEGORY_COLORS = {
  Vacuno: 'red',
  Cerdo: 'pink',
  Pollo: 'yellow',
  Embutidos: 'grape',
  Otros: 'gray',
};

// Case-insensitive a propósito: si el backend manda "VACUNO" o "vacuno",
// igual encuentra el color.
export const getCategoryColor = (category) => {
  const buscada = String(category ?? '').toLowerCase();

  // Buscamos la clave que coincida sin importar mayúsculas.
  const clave = Object.keys(CATEGORY_COLORS).find(
    (nombre) => nombre.toLowerCase() === buscada,
  );

  return CATEGORY_COLORS[clave] ?? 'gray';
};
