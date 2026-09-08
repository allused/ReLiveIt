import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useClaimName } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { AppButton, AppTextField, ErrorText, Eyebrow, Screen } from '../components/ui';
import { useT } from '../i18n';

export function WelcomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const claimName = useClaimName();
  const t = useT();
  const [primaryName, setPrimaryName] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [error, setError] = useState('');

  if (loading) {
    return (
      <Screen>
        <Typography variant="h1">ReLiveIt</Typography>
      </Screen>
    );
  }
  if (!user || user.kind !== 'participant' || user.role !== 'GUEST') {
    return <Navigate to="/login" replace />;
  }
  if (user.claimed) {
    return <Navigate to={`/wedding/${user.weddingSlug}`} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const next = await claimName.mutateAsync({
        primaryName,
        secondaryName: secondaryName.trim() || null,
      });
      if (next.kind === 'participant') {
        navigate(`/wedding/${next.weddingSlug}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('welcome.saveFailed'));
    }
  };

  return (
    <Screen>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LanguageSwitch />
      </Box>
      <Eyebrow>{user.weddingName}</Eyebrow>
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('welcome.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {t('welcome.body')}
      </Typography>
      <Stack component="form" spacing={2} sx={{ mt: 4 }} onSubmit={(event) => void onSubmit(event)}>
        <AppTextField
          label={t('welcome.yourName')}
          value={primaryName}
          onChange={(e) => setPrimaryName(e.target.value)}
          autoComplete="given-name"
          autoFocus
        />
        <AppTextField
          label={t('welcome.partnerName')}
          value={secondaryName}
          onChange={(e) => setSecondaryName(e.target.value)}
          autoComplete="off"
        />
        <ErrorText>{error}</ErrorText>
        <AppButton type="submit" disabled={claimName.isPending || !primaryName.trim()} fullWidth>
          {claimName.isPending ? t('common.saving') : t('common.continue')}
        </AppButton>
      </Stack>
    </Screen>
  );
}
