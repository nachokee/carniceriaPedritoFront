import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
});

// Lee el token de la misma clave de localStorage que usa AuthContext.
function getStoredToken() {
  try {
    const stored = localStorage.getItem('auth');
    return stored ? JSON.parse(stored).token : null;
  } catch {
    return null;
  }
}

// Agrega el token a cada request si hay sesión iniciada.
axiosClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Si el backend responde 401 (token vencido o inválido), borramos la sesión
// y mandamos al login.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const message =
      error.response?.data?.message ?? error.message ?? 'Error inesperado';
    return Promise.reject(new Error(message));
  },
);

export default axiosClient;
