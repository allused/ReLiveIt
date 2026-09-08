import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Navigate, useOutletContext, useParams } from 'react-router-dom';
import { useQuickVote } from '../../api/hooks';
import { EmptyState, Eyebrow, Screen } from '../../components/ui';
import { VoteDeck } from '../../components/VoteDeck';
import { useT } from '../../i18n';
import type { GuestOutletContext } from './GuestHome';

export function QuickVotePage() {
  const { slug } = useParams();
  const { wedding } = useOutletContext<GuestOutletContext>();
  const enabled = Boolean(wedding?.quickVoteEnabled);
  const voteQuery = useQuickVote(slug, enabled);
  const t = useT();
  const [done, setDone] = useState<number | null>(null);

  if (!wedding) {
    return null;
  }
  if (!wedding.quickVoteEnabled) {
    return <Navigate to={`/wedding/${slug}`} replace />;
  }

  const photos = voteQuery.data?.photos ?? null;
  const requested = voteQuery.data?.requested ?? 20;

  return (
    <Screen>
      <Eyebrow>{t('guest.quickVote.eyebrow')}</Eyebrow>
      <Typography variant="h1">{t('guest.quickVote.title')}</Typography>
      {photos && photos.length > 0 && photos.length < requested && (
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          {t('guest.quickVote.fewerReady', { ready: photos.length, requested })}
        </Typography>
      )}
      {voteQuery.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {voteQuery.error.message}
        </Alert>
      )}
      {photos && photos.length === 0 && (
        <Box sx={{ mt: 3 }}>
          <EmptyState title={t('guest.quickVote.caughtUpTitle')} body={t('guest.quickVote.caughtUpBody')} />
        </Box>
      )}
      {photos && photos.length > 0 && done === null && (
        <Box sx={{ mt: 2 }}>
          <VoteDeck photos={photos} onDone={setDone} />
        </Box>
      )}
      {done !== null && (
        <Box sx={{ mt: 3 }}>
          <EmptyState
            title={t('guest.quickVote.doneTitle')}
            body={t('guest.quickVote.doneBody', { count: done })}
          />
        </Box>
      )}
    </Screen>
  );
}
