import { useEffect, useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { WeddingSummary } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { AppButton, AppCard, AppTextField, ErrorText, Eyebrow, Screen } from '../../components/ui';

export function AdminDashboard() {
  const { logout, user } = useAuth();
  const [weddings, setWeddings] = useState<WeddingSummary[]>([]);
  const [name, setName] = useState('');
  const [quickVoteEnabled, setQuickVoteEnabled] = useState(false);
  const [quickVote, setQuickVote] = useState(20);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await api<WeddingSummary[]>('/admin/weddings');
    setWeddings(data);
  };

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not load weddings.');
    });
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/admin/weddings', {
        method: 'POST',
        body: JSON.stringify({
          name,
          quickVoteEnabled,
          quickVotePhotoCount: quickVote,
        }),
      });
      setName('');
      setQuickVoteEnabled(false);
      setQuickVote(20);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create wedding.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Eyebrow>Admin</Eyebrow>
          <Typography variant="h1">Weddings</Typography>
          <Typography color="text.secondary">{user?.kind === 'admin' ? user.username : ''}</Typography>
        </Box>
        <AppButton tone="ghost" onClick={() => void logout()}>
          Sign out
        </AppButton>
      </Stack>

      <AppCard sx={{ mt: 4 }}>
        <Typography variant="h2">Create a wedding</Typography>
        <Stack component="form" spacing={2} sx={{ mt: 2 }} onSubmit={(event) => void create(event)}>
          <AppTextField
            label="Wedding name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Anna & Peter"
            required
          />
          <FormControlLabel
            control={
              <Switch
                checked={quickVoteEnabled}
                onChange={(event) => setQuickVoteEnabled(event.target.checked)}
              />
            }
            label="Include Quick Vote"
          />
          {quickVoteEnabled && (
            <AppTextField
              label="Quick Vote photos"
              type="number"
              slotProps={{ htmlInput: { min: 1, max: 50 } }}
              value={quickVote}
              onChange={(e) => setQuickVote(Number(e.target.value))}
              helperText="Guests swipe through a short mix of photos."
            />
          )}
          <AppButton type="submit" disabled={busy} fullWidth>
            Create wedding
          </AppButton>
        </Stack>
      </AppCard>
      <ErrorText>{error}</ErrorText>

      <Stack spacing={1.5} sx={{ mt: 4 }}>
        {weddings.map((wedding) => (
          <AppCard key={wedding.id}>
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Eyebrow>{wedding.status}</Eyebrow>
                <Typography variant="h2">{wedding.name}</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                  {wedding.categoryCount ?? 0} categories · {wedding.photoCount ?? 0} photos
                </Typography>
                {wedding.quickVoteEnabled && (
                  <Chip size="small" label="Quick Vote" sx={{ mt: 1 }} />
                )}
              </Box>
              <AppButton component={RouterLink} to={`/admin/weddings/${wedding.id}`}>
                Manage
              </AppButton>
            </Stack>
          </AppCard>
        ))}
      </Stack>
    </Screen>
  );
}
