import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Navigate, useOutletContext, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Photo } from '../../api/types';
import { EmptyState, Eyebrow, Screen } from '../../components/ui';
import { VoteDeck } from '../../components/VoteDeck';
import type { GuestOutletContext } from './GuestHome';

export function QuickVotePage() {
  const { slug } = useParams();
  const { wedding } = useOutletContext<GuestOutletContext>();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [requested, setRequested] = useState(20);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug || !wedding?.quickVoteEnabled) return;
    void api<{ photos: Photo[]; requested: number; total: number }>(`/weddings/${slug}/quick-vote`)
      .then((data) => {
        setPhotos(data.photos);
        setRequested(data.requested);
      })
      .catch((err: Error) => setError(err.message));
  }, [slug, wedding?.quickVoteEnabled]);

  if (!wedding) {
    return null;
  }
  if (!wedding.quickVoteEnabled) {
    return <Navigate to={`/wedding/${slug}`} replace />;
  }

  return (
    <Screen>
      <Eyebrow>Quick Vote</Eyebrow>
      <Typography variant="h1">A short mix</Typography>
      {photos && photos.length > 0 && photos.length < requested && (
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          {photos.length} photos are ready — fewer than the usual {requested}.
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {photos && photos.length === 0 && (
        <Box sx={{ mt: 3 }}>
          <EmptyState title="You're all caught up" body="There are no more photos for you to vote on right now." />
        </Box>
      )}
      {photos && photos.length > 0 && done === null && (
        <Box sx={{ mt: 2 }}>
          <VoteDeck photos={photos} onDone={setDone} />
        </Box>
      )}
      {done !== null && (
        <Box sx={{ mt: 3 }}>
          <EmptyState title="Session complete" body={`You voted on ${done} photos. Thank you.`} />
        </Box>
      )}
    </Screen>
  );
}
