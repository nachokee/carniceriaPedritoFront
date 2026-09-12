import {
  Alert,
  Anchor,
  Button,
  Card,
  Container,
  Group,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Un useState por campo del formulario. Cada input muestra su estado
  // (value) y lo actualiza al escribir (onChange): eso es un input controlado.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // fieldErrors: lo que está mal en cada campo (se muestra debajo del campo).
  // error: lo que falló del lado del servidor (se muestra como Alert arriba).
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    const errors = {};

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = 'Escribí un email válido';
    }

    if (password.length < 6) {
      errors.password = 'La contraseña tiene al menos 6 caracteres';
    }

    return errors;
  }

  const handleSubmit = async (event) => {
    // Sin esto el navegador recarga la página al mandar el formulario.
    event.preventDefault();

    const errors = validate();

    // Si hay algo mal en los campos, ni siquiera llamamos a la API.
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      // replace: true evita que "volver" en el navegador traiga de nuevo el login.
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(
        requestError.message ??
          'No pudimos iniciar sesión. Revisá los datos e intentá de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} py={{ base: 40, sm: 80 }}>
      <Title order={2} ta="center" mb="lg">
        Iniciar sesión
      </Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
              {error}
            </Alert>
          )}

          <TextInput
            label="Email"
            placeholder="juan@mail.com"
            type="email"
            // autoComplete e inputMode: en celular abre el teclado correcto y
            // deja que el navegador ofrezca los datos guardados.
            autoComplete="email"
            required
            value={email}
            error={fieldErrors.email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />

          <PasswordInput
            label="Contraseña"
            placeholder="Tu contraseña"
            autoComplete="current-password"
            required
            mt="md"
            value={password}
            error={fieldErrors.password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />

          {/* type="submit" hace que el botón dispare el onSubmit del form,
              así también funciona apretando Enter. */}
          <Button type="submit" fullWidth mt="lg" loading={loading}>
            Entrar
          </Button>
        </form>
      </Card>

      <Group justify="center" gap={4} mt="md">
        <Text size="sm" c="dimmed">
          ¿No tenés cuenta?
        </Text>
        <Anchor component={Link} to="/register" size="sm">
          Registrate
        </Anchor>
      </Group>
    </Container>
  );
}

export default LoginPage;
