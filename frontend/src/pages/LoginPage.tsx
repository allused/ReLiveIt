import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useLogin } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { AppButton, AppTextField, ErrorText, Eyebrow, Screen } from '../components/ui';
import { useT } from '../i18n';

export function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const login = useLogin();
  const t = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user?.kind === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await login.mutateAsync({ username, password });
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('login.failed'));
    }
  };

  return (
    <Screen>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LanguageSwitch />
      </Box>
      <Eyebrow>ReLiveIt</Eyebrow>
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('login.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {t('login.body')}
      </Typography>
      <Stack component="form" spacing={2} sx={{ mt: 4 }} onSubmit={(event) => void onSubmit(event)}>
        <AppTextField
          label={t('login.username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <AppTextField
          label={t('login.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <ErrorText>{error}</ErrorText>
        <AppButton type="submit" disabled={login.isPending} fullWidth>
          {login.isPending ? t('login.signingIn') : t('login.signIn')}
        </AppButton>
      </Stack>
    </Screen>
  );
}
