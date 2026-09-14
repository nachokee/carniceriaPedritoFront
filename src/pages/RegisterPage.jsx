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

function RegisterPage() {
  // register() del contexto ya deja la sesión iniciada, así que después de
  // registrarse no hace falta pasar por el login.
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    const errors = {};

    if (name.trim().length < 2) {
      errors.name = 'Escribí tu nombre';
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = 'Escribí un email válido';
    }

    if (password.length < 6) {
      errors.password = 'Usá al menos 6 caracteres';
    }

    return errors;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = validate();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setLoading(true);

    try {
      await register(name, email, password);
      navigate('/catalogo', { replace: true });
    } catch (requestError) {
      setError(
        requestError.message ?? 'No pudimos crear la cuenta. Intentá de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} py={{ base: 40, sm: 80 }}>
      <Title order={2} ta="center" mb="lg">
        Crear cuenta
      </Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
              {error}
            </Alert>
          )}

          <TextInput
            label="Nombre"
            placeholder="Juan Pérez"
            autoComplete="name"
            required
            value={name}
            error={fieldErrors.name}
            onChange={(event) => setName(event.currentTarget.value)}
          />

          <TextInput
            label="Email"
            placeholder="juan@mail.com"
            type="email"
            autoComplete="email"
            required
            mt="md"
            value={email}
            error={fieldErrors.email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />

          <PasswordInput
            label="Contraseña"
            placeholder="Elegí una contraseña"
            autoComplete="new-password"
            required
            mt="md"
            value={password}
            error={fieldErrors.password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />

          <Button type="submit" fullWidth mt="lg" loading={loading}>
            Crear cuenta
          </Button>
        </form>
      </Card>

      <Group justify="center" gap={4} mt="md">
        <Text size="sm" c="dimmed">
          ¿Ya tenés cuenta?
        </Text>
        <Anchor component={Link} to="/login" size="sm">
          Iniciá sesión
        </Anchor>
      </Group>
    </Container>
  );
}

export default RegisterPage;
