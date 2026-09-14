import axiosClient from './axiosClient';
import { USE_MOCK_INVOICES } from '../config';
import { normalizeStatus, toNumber } from './normalize';

// El flag vive en src/config.js (se puede pisar con VITE_USE_MOCK_INVOICES en .env).
// En true devolvemos datos falsos; en false pegamos contra invoice-service.

// details = { customer, items } y SOLO lo usa el mock.
//
// ¿Por qué hace falta? Porque el backend real va a buscar el pedido en la base
// con el orderId, pero el mock no tiene base: si no le pasamos los items no
// tiene de dónde sacarlos. Cuando USE_MOCK_INVOICES pase a false, este parámetro se
// ignora y la pantalla no cambia.
// La factura tiene su propia forma: los items llevan subtotal ya calculado y
// no llevan productId. Si el backend manda los datos del cliente planos
// (customerName / customerEmail), acá los volvemos a anidar.
function normalizeInvoice(data, orderId) {
  const items = (data.items ?? []).map((item) => ({
    name: item.name ?? item.productName,
    quantity: toNumber(item.quantity),
    unit: item.unit ?? 'kg',
    price: toNumber(item.price),
    subtotal: toNumber(
      item.subtotal ?? toNumber(item.price) * toNumber(item.quantity),
    ),
  }));

  return {
    invoiceId: data.invoiceId ?? data.id,
    orderId: data.orderId ?? orderId,
    date: data.date ?? data.issuedAt ?? data.createdAt,
    customer: data.customer ?? {
      name: data.customerName,
      email: data.customerEmail,
    },
    items,
    total: toNumber(
      data.total ?? items.reduce((sum, item) => sum + item.subtotal, 0),
    ),
    status: normalizeStatus(data.status) || 'emitida',
  };
}

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
  return normalizeInvoice(response.data, orderId);
}
