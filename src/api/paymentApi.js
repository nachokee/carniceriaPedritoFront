import axiosClient from './axiosClient';

// Mismo patrón que catalogApi.js, orderApi.js y authApi.js: mientras no exista
// el payment-service, devolvemos una respuesta falsa.
const USE_MOCK = true;

export async function processPayment(orderId, paymentInfo) {
  if (USE_MOCK) {
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
