import axiosClient from './axiosClient';
import { USE_MOCK_AUTH } from '../config';

// El flag vive en src/config.js (se puede pisar con VITE_USE_MOCK_AUTH en .env).
// En true devolvemos datos falsos; en false pegamos contra auth-service.

// Dos usuarios de prueba, uno de cada rol.
const mockCustomer = {
  id: 1,
  name: 'Juan Pérez',
  email: 'juan@mail.com',
  role: 'cliente',
};

const mockAdmin = {
  id: 2,
  name: 'Admin Carnicería',
  email: 'admin@carniceria.com',
  role: 'admin',
};

// Pequeña ayuda para simular la demora de una llamada real.
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function login(email, password) {
  if (USE_MOCK_AUTH) {
    await delay(600);

    // Truco para poder probar los dos roles sin backend: si el email tiene la
    // palabra "admin", entrás como administrador. Si no, como cliente.
    // La contraseña no se valida mientras esté mockeado.
    const isAdmin = email.toLowerCase().includes('admin');
    const user = isAdmin ? mockAdmin : mockCustomer;

    return { user, token: isAdmin ? 'mock-token-admin' : 'mock-token-123' };
  }

  const response = await axiosClient.post('/auth/login', { email, password });
  return response.data;
}

export async function register(name, email, password) {
  if (USE_MOCK_AUTH) {
    await delay(600);

    // Quien se registra siempre arranca como cliente: los admin se crean
    // por otro lado (a mano en la base, o desde un panel interno).
    return {
      user: { id: 3, name, email, role: 'cliente' },
      token: 'mock-token-456',
    };
  }

  const response = await axiosClient.post('/auth/register', {
    name,
    email,
    password,
  });
  return response.data;
}

export async function logout() {
  if (USE_MOCK_AUTH) {
    return;
  }

  await axiosClient.post('/auth/logout');
}
