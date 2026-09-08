import { useState } from 'react';
import Box from '@mui/material/Box';
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
import { ApiError } from '../../api/client';
import { useConcludeWedding, useReviewerDashboard } from '../../api/hooks';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { AppButton, ErrorText, Eyebrow, Screen } from '../../components/ui';
import { useT } from '../../i18n';

export function ReviewerHome() {
  const { weddingId } = useParams();
  const { data } = useReviewerDashboard(weddingId);
  const concludeWedding = useConcludeWedding();
  const t = useT();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');

  const conclude = async () => {
    if (!weddingId) return;
    try {
      await concludeWedding.mutateAsync(weddingId);
      setConfirm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('reviewer.home.concludeFailed'));
    }
  };

  if (!data) return <Screen>{t('common.loading')}</Screen>;
  const active = data.status === 'ACTIVE';

  return (
    <Screen>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LanguageSwitch />
      </Box>
      <Eyebrow>{active ? t('reviewer.home.active') : t('reviewer.home.concluded')}</Eyebrow>
      <Typography variant="h1">{data.name}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {t('reviewer.home.stats', {
          photos: data.photoCount,
          categories: data.categoryCount,
          guests: data.guestCount,
        })}
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 4 }}>
        <NavCard
          to={`/reviewer/${weddingId}/gallery`}
          title={t('reviewer.home.gallery')}
          body={t('reviewer.home.galleryBody')}
        />
        <NavCard to={`/reviewer/${weddingId}/categories`} title={t('reviewer.home.categories')} />
        <NavCard
          to={`/reviewer/${weddingId}/timeline`}
          title={t('reviewer.home.timeline')}
          body={t('reviewer.home.timelineBody')}
        />
        {!active && (
          <NavCard
            to={`/reviewer/${weddingId}/rankings`}
            title={t('reviewer.home.topPhotos')}
            body={t('reviewer.home.topPhotosBody')}
            gold
          />
        )}
      </Stack>
      {active && (
        <AppButton tone="danger" fullWidth sx={{ mt: 4 }} onClick={() => setConfirm(true)}>
          {t('reviewer.home.conclude')}
        </AppButton>
      )}
      <ErrorText>{error}</ErrorText>
      <Dialog open={confirm} onClose={() => setConfirm(false)} fullWidth>
        <DialogTitle>{t('reviewer.home.concludeTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('reviewer.home.concludeBody')}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton tone="ghost" onClick={() => setConfirm(false)}>
            {t('common.cancel')}
          </AppButton>
          <AppButton tone="danger" onClick={() => void conclude()} disabled={concludeWedding.isPending}>
            {t('reviewer.home.concludeConfirm')}
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
