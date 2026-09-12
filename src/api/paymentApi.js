import axiosClient from './axiosClient';
import { USE_MOCK_PAYMENTS } from '../config';

// El flag vive en src/config.js (se puede pisar con VITE_USE_MOCK_PAYMENTS en .env).
// En true devolvemos datos falsos; en false pegamos contra payment-service.

export async function processPayment(orderId, paymentInfo) {
  if (USE_MOCK_PAYMENTS) {
    // 1,2s para que se vea el estado "procesando" del botón.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Truco para poder probar la pantalla de error: cualquier tarjeta terminada
    // en 0 sale rechazada. El resto se aprueba.
    const isRejected =
      paymentInfo.method === 'tarjeta' && paymentInfo.cardNumber?.endsWith('0');

    if (isRejected) {
      return {
        paymentId: null,
        status: 'rejected',
        orderId,
        message: 'La tarjeta fue rechazada por el banco.',
      };
    }

    return { paymentId: 'mock-pay-1', status: 'approved', orderId };
  }

  const response = await axiosClient.post('/payments', { orderId, paymentInfo });
  return response.data;
}
