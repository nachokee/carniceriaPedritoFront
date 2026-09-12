import { createContext, useContext, useState } from 'react';
import * as authApi from '../api/authApi';

// Clave con la que guardamos la sesión en localStorage (el "cajón" del navegador
// que sobrevive a un F5).
const STORAGE_KEY = 'auth';

const emptyAuth = { user: null, token: null };

const AuthContext = createContext(null);

// Lee la sesión guardada. Si no hay nada, o quedó algo roto, arranca vacío.
function readStoredAuth() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : emptyAuth;
  } catch {
    return emptyAuth;
  }
}

export function AuthProvider({ children }) {
  // Pasarle una FUNCIÓN a useState hace que se ejecute una sola vez, en el
  // primer render. Así rehidratamos la sesión sin necesidad de useEffect.
  const [auth, setAuth] = useState(readStoredAuth);

  // Guardamos siempre en los dos lados a la vez: el estado (para que React
  // vuelva a renderizar) y localStorage (para que sobreviva al refresh).
  function saveAuth(next) {
    setAuth(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async function login(email, password) {
    const data = await authApi.login(email, password);
    saveAuth({ user: data.user, token: data.token });
  }

  async function register(name, email, password) {
    const data = await authApi.register(name, email, password);
    saveAuth({ user: data.user, token: data.token });
  }

  async function logout() {
    await authApi.logout();
    setAuth(emptyAuth);
    localStorage.removeItem(STORAGE_KEY);
  }

  const value = {
    user: auth.user,
    token: auth.token,
    // Si hay token, la persona está logueada. Se recalcula en cada render,
    // así que nunca queda desfasado del estado.
    isAuthenticated: Boolean(auth.token),
    // El rol viene dentro de user, así que ya se guarda en localStorage con
    // el resto de la sesión. isAdmin es solo un atajo para las pantallas.
    isAdmin: auth.user?.role === 'admin',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Atajo para no repetir useContext(AuthContext) en cada pantalla.
// oxlint-disable-next-line react/only-export-components -- provider + hook juntos es el patrón habitual
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth() se tiene que usar adentro de <AuthProvider>');
  }

  return context;
}
