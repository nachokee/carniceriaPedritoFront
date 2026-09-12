import axiosClient from './axiosClient';
import { USE_MOCK_INVOICES } from '../config';

// El flag vive en src/config.js (se puede pisar con VITE_USE_MOCK_INVOICES en .env).
// En true devolvemos datos falsos; en false pegamos contra invoice-service.

// details = { customer, items } y SOLO lo usa el mock.
//
// ¿Por qué hace falta? Porque el backend real va a buscar el pedido en la base
// con el orderId, pero el mock no tiene base: si no le pasamos los items no
// tiene de dónde sacarlos. Cuando USE_MOCK_INVOICES pase a false, este parámetro se
// ignora y la pantalla no cambia.
export async function generateInvoice(orderId, details) {
  if (USE_MOCK_INVOICES) {
    await new Promise((resolve) => setTimeout(resolve, 700));

    if (!details?.items?.length) {
      throw new Error(
        'Mientras la facturación está mockeada, la factura se genera con los datos del pedido anterior. Entrá desde la pantalla de confirmación.',
      );
    }

    // Pasamos los items del carrito al formato de la factura, agregando el
    // subtotal de cada línea.
    const items = details.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      subtotal: item.price * item.quantity,
    }));

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      invoiceId: 'mock-inv-1',
      orderId,
      date: new Date().toISOString(),
      customer: details.customer,
      items,
      total,
      status: 'emitida',
    };
  }

  const response = await axiosClient.get(`/invoices/${orderId}`);
  return response.data;
}
