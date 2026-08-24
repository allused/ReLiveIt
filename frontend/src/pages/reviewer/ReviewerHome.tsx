import { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { AppButton, ErrorText, Eyebrow, Screen } from '../../components/ui';

type Dashboard = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CONCLUDED';
  photoCount: number;
  categoryCount: number;
  guestCount: number;
};

export function ReviewerHome() {
  const { weddingId } = useParams();
  const [data, setData] = useState<Dashboard | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!weddingId) return;
    void api<Dashboard>(`/reviewer/weddings/${weddingId}`).then(setData);
  };

  useEffect(() => {
    load();
  }, [weddingId]);

  const conclude = async () => {
    if (!weddingId) return;
    try {
      await api(`/reviewer/weddings/${weddingId}/conclude`, { method: 'POST' });
      setConfirm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not conclude the wedding.');
    }
  };

  if (!data) return <Screen>Loading…</Screen>;
  const active = data.status === 'ACTIVE';

  return (
    <Screen>
      <Eyebrow>{active ? 'Wedding is active' : 'Wedding concluded'}</Eyebrow>
      <Typography variant="h1">{data.name}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {data.photoCount} photos · {data.categoryCount} categories · {data.guestCount} guests
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 4 }}>
        <NavCard to={`/reviewer/${weddingId}/gallery`} title="Gallery" body="Every photo as it arrives" />
        <NavCard to={`/reviewer/${weddingId}/categories`} title="Categories" />
        <NavCard to={`/reviewer/${weddingId}/timeline`} title="Timeline" body="Relive the evening" />
        {!active && (
          <NavCard to={`/reviewer/${weddingId}/rankings`} title="Top photos" body="Final rankings" gold />
        )}
      </Stack>
      {active && (
        <AppButton tone="danger" fullWidth sx={{ mt: 4 }} onClick={() => setConfirm(true)}>
          Conclude wedding
        </AppButton>
      )}
      <ErrorText>{error}</ErrorText>
      <Dialog open={confirm} onClose={() => setConfirm(false)} fullWidth>
        <DialogTitle>Conclude this wedding?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            After concluding, guests will no longer be able to upload or vote on photos.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton tone="ghost" onClick={() => setConfirm(false)}>
            Cancel
          </AppButton>
          <AppButton tone="danger" onClick={() => void conclude()}>
            Conclude
          </AppButton>
        </DialogActions>
      </Dialog>
    </Screen>
  );
}

function NavCard({
  to,
  title,
  body,
  gold,
}: {
  to: string;
  title: string;
  body?: string;
  gold?: boolean;
}) {
  return (
    <Card sx={gold ? { bgcolor: 'secondary.main', color: 'secondary.contrastText' } : undefined}>
      <CardActionArea component={RouterLink} to={to}>
        <CardContent>
          <Typography variant="h2" color={gold ? 'inherit' : undefined}>
            {title}
          </Typography>
          {body && (
            <Typography variant="body2" color={gold ? 'inherit' : 'text.secondary'} sx={{ opacity: gold ? 0.85 : 1 }}>
              {body}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
