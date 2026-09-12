import { AppShell } from '@mantine/core';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

// Envuelve las pantallas privadas. Hace dos cosas:
// 1) si no hay sesión, redirige a /login
// 2) si hay sesión, dibuja el header con el nombre del usuario arriba de la pantalla
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // <Navigate> redirige apenas se renderiza. replace: no deja la pantalla
    // privada en el historial del navegador.
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell header={{ height: 60 }} padding={0}>
      {/* no-print: el header no sale al imprimir la factura */}
      <AppShell.Header className="no-print">
        <Navbar />
      </AppShell.Header>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}

export default ProtectedRoute;
