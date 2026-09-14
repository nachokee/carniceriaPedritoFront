import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatDateTime } from './format';

// Intl separa el signo $ del número con un espacio "duro" (no separable).
// A la vista es igual que el de la barra espaciadora, pero para JavaScript
// son dos caracteres distintos y la comparación fallaría.
//
// String.fromCharCode(160) es ese espacio raro. Lo escribimos así, por su
// código, y no pegando el carácter: un espacio invisible en medio del código
// es imposible de descubrir después.
const ESPACIO_DURO = String.fromCharCode(160);

// Cambia el espacio duro por uno común, así los expect de abajo se leen
// naturales: "$ 8.900" y no un texto con un carácter invisible adentro.
const normalizar = (texto) => texto.split(ESPACIO_DURO).join(' ');

describe('formatCurrency', () => {
  it('formatea un precio con separador de miles', () => {
    expect(normalizar(formatCurrency(8900))).toBe('$ 8.900');
    expect(normalizar(formatCurrency(17800))).toBe('$ 17.800');
  });

  it('no muestra decimales cuando el precio es redondo', () => {
    expect(normalizar(formatCurrency(4500))).toBe('$ 4.500');
  });

  it('muestra los decimales cuando los hay', () => {
    expect(normalizar(formatCurrency(1234.5))).toBe('$ 1.234,5');
  });

  // Este es el caso que más importa: el backend puede mandar el precio como el
  // string "8900.00" (así serializa Java los BigDecimal).
  it('acepta el precio como texto y no rompe', () => {
    expect(normalizar(formatCurrency('8900'))).toBe('$ 8.900');
  });

  // Si algo viene mal, preferimos mostrar $ 0 antes que "$ NaN".
  it('cae en cero si el valor no es un número', () => {
    expect(normalizar(formatCurrency(undefined))).toBe('$ 0');
    expect(normalizar(formatCurrency(null))).toBe('$ 0');
    expect(normalizar(formatCurrency('no soy un número'))).toBe('$ 0');
  });
});

describe('formatDate', () => {
  // Armamos la fecha con año/mes/día sueltos y no con un texto ISO a propósito:
  // así el test da igual en cualquier zona horaria. (Ojo: en JavaScript los
  // meses empiezan en 0, así que el 8 es septiembre.)
  it('formatea una fecha en castellano', () => {
    expect(formatDate(new Date(2026, 8, 8))).toBe('8 sept 2026');
  });

  it('acepta una fecha en texto', () => {
    expect(formatDate('2026-09-08T12:15:00Z')).toContain('2026');
  });

  // Esto es lo que evita que la pantalla muestre "Invalid Date".
  it('devuelve un guion si la fecha no se puede leer', () => {
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('cualquier cosa')).toBe('—');
  });
});

describe('formatDateTime', () => {
  // No comparamos el texto completo porque el "9:15 a. m." cambia según la
  // versión del navegador. Alcanza con verificar que estén la fecha y la hora.
  it('muestra la fecha y la hora', () => {
    const resultado = formatDateTime(new Date(2026, 8, 8, 9, 15));

    expect(resultado).toContain('8 sept 2026');
    expect(resultado).toContain('9:15');
  });

  it('devuelve un guion si la fecha no se puede leer', () => {
    expect(formatDateTime('cualquier cosa')).toBe('—');
  });
});
