import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const theme = createTheme({
  primaryColor: 'red',
  fontFamily: 'Inter, system-ui, sans-serif',
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* MantineProvider va por fuera del ErrorBoundary para que la pantalla
        de error también se vea con los estilos de Mantine. */}
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />

      {/* Si algo revienta sin que nadie lo atrape, en vez de una pantalla en
          blanco se muestra el mensaje de ErrorBoundary. */}
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </MantineProvider>
  </StrictMode>,
);
