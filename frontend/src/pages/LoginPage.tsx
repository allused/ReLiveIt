import { useState, type FormEvent } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AppButton, AppTextField, ErrorText, Eyebrow, Screen } from '../components/ui';

export function LoginPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user?.kind === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      await refresh();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Eyebrow>ReLiveIt</Eyebrow>
      <Typography variant="h1" sx={{ mt: 1 }}>
        Admin
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Sign in to create and manage weddings.
      </Typography>
      <Stack component="form" spacing={2} sx={{ mt: 4 }} onSubmit={(event) => void onSubmit(event)}>
        <AppTextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <AppTextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <ErrorText>{error}</ErrorText>
        <AppButton type="submit" disabled={busy} fullWidth>
          {busy ? 'Signing in…' : 'Sign in'}
        </AppButton>
      </Stack>
    </Screen>
  );
}
