import { AppShell } from '@mantine/core';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from './AdminNavbar';

// Igual que ProtectedRoute, pero además exige que el usuario sea admin.
// Hace tres cosas:
// 1) sin sesión → al login
// 2) con sesión pero sin rol admin → al listado de productos (un cliente no
//    tiene por qué enterarse de que estas pantallas existen)
// 3) si es admin → dibuja el header del panel arriba de la pantalla
function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppShell header={{ height: 60 }} padding={0}>
      <AppShell.Header className="no-print">
        <AdminNavbar />
      </AppShell.Header>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}

export default AdminRoute;
