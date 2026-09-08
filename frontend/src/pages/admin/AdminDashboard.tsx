import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { useAdminWeddings, useCreateWedding } from '../../api/hooks';
import { useAuth } from '../../auth/AuthContext';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { AppButton, AppCard, AppTextField, ErrorText, Eyebrow, Screen } from '../../components/ui';
import { useT } from '../../i18n';

export function AdminDashboard() {
  const { logout, user } = useAuth();
  const weddingsQuery = useAdminWeddings();
  const createWedding = useCreateWedding();
  const t = useT();
  const [name, setName] = useState('');
  const [quickVoteEnabled, setQuickVoteEnabled] = useState(false);
  const [quickVote, setQuickVote] = useState(20);
  const [error, setError] = useState('');

  const weddings = weddingsQuery.data ?? [];

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await createWedding.mutateAsync({
        name,
        quickVoteEnabled,
        quickVotePhotoCount: quickVote,
      });
      setName('');
      setQuickVoteEnabled(false);
      setQuickVote(20);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.createFailed'));
    }
  };

  const loadError =
    error ||
    (weddingsQuery.error instanceof ApiError
      ? weddingsQuery.error.message
      : weddingsQuery.error
        ? t('admin.loadWeddingsFailed')
        : '');

  return (
    <Screen>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LanguageSwitch />
      </Box>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Eyebrow>{t('admin.title')}</Eyebrow>
          <Typography variant="h1">{t('admin.weddings')}</Typography>
          <Typography color="text.secondary">{user?.kind === 'admin' ? user.username : ''}</Typography>
        </Box>
        <AppButton tone="ghost" onClick={() => void logout()}>
          {t('common.signOut')}
        </AppButton>
      </Stack>

      <AppCard sx={{ mt: 4 }}>
        <Typography variant="h2">{t('admin.createTitle')}</Typography>
        <Stack component="form" spacing={2} sx={{ mt: 2 }} onSubmit={(event) => void create(event)}>
          <AppTextField
            label={t('admin.weddingName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('admin.weddingPlaceholder')}
            required
          />
          <FormControlLabel
            control={
              <Switch
                checked={quickVoteEnabled}
                onChange={(event) => setQuickVoteEnabled(event.target.checked)}
              />
            }
            label={t('admin.includeQuickVote')}
          />
          {quickVoteEnabled && (
            <AppTextField
              label={t('admin.quickVotePhotos')}
              type="number"
              slotProps={{ htmlInput: { min: 1, max: 50 } }}
              value={quickVote}
              onChange={(e) => setQuickVote(Number(e.target.value))}
              helperText={t('admin.quickVoteHelp')}
            />
          )}
          <AppButton type="submit" disabled={createWedding.isPending} fullWidth>
            {t('admin.createWedding')}
          </AppButton>
        </Stack>
      </AppCard>
      <ErrorText>{loadError}</ErrorText>

      <Stack spacing={1.5} sx={{ mt: 4 }}>
        {weddings.map((wedding) => (
          <AppCard key={wedding.id}>
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Eyebrow>{t(`status.${wedding.status}`)}</Eyebrow>
                <Typography variant="h2">{wedding.name}</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                  {t('admin.weddingStats', {
                    categories: wedding.categoryCount ?? 0,
                    photos: wedding.photoCount ?? 0,
                  })}
                </Typography>
                {wedding.quickVoteEnabled && (
                  <Chip size="small" label={t('nav.quickVote')} sx={{ mt: 1 }} />
                )}
              </Box>
              <AppButton component={RouterLink} to={`/admin/weddings/${wedding.id}`}>
                {t('admin.manage')}
              </AppButton>
            </Stack>
          </AppCard>
        ))}
      </Stack>
    </Screen>
  );
}
