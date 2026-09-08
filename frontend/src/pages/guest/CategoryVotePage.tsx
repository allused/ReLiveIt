import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useGuestPhotos, useGuestWedding, useVoteQueue } from '../../api/hooks';
import { PhotoGrid } from '../../components/PhotoGrid';
import { PhotoViewer } from '../../components/PhotoViewer';
import { AppButton, EmptyState, Screen } from '../../components/ui';
import { VoteDeck } from '../../components/VoteDeck';
import { useT } from '../../i18n';

export function CategoryVotePage() {
  const { slug, categoryId } = useParams();
  const { data: wedding } = useGuestWedding(slug);
  const photosQuery = useGuestPhotos(slug, { categoryId, limit: 60 });
  const t = useT();
  const [done, setDone] = useState<number | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);

  const category = wedding?.categories.find((c) => c.id === categoryId) ?? null;
  const concluded = wedding?.status === 'CONCLUDED';
  const voting = Boolean(wedding) && !concluded && done === null;
  const photos = photosQuery.data?.items ?? [];
  const queueQuery = useVoteQueue(slug, categoryId, voting);
  const queue = queueQuery.data?.photos ?? null;

  return (
    <Screen>
      <AppButton tone="ghost" component={RouterLink} to={`/wedding/${slug}/categories`} sx={{ mb: 1 }}>
        {t('guest.categories.all')}
      </AppButton>
      <Typography variant="h1">{category?.name}</Typography>
      {voting && (
        <Box sx={{ mt: 3 }}>
          {queueQuery.isPending ? null : queue && queue.length === 0 ? (
            <EmptyState title={t('guest.categories.caughtUpTitle')} body={t('guest.categories.caughtUpBody')} />
          ) : queue ? (
            <VoteDeck photos={queue} onDone={setDone} />
          ) : null}
        </Box>
      )}
      {done !== null && (
        <Box sx={{ mt: 3 }}>
          <EmptyState title={t('guest.categories.niceWork')} body={t('guest.categories.voted', { count: done })} />
        </Box>
      )}
      {(concluded || done !== null) && (
        <>
          <Typography variant="h2" sx={{ mt: 5 }}>
            {t('guest.categories.gallery')}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <PhotoGrid photos={photos} onOpen={setViewer} />
          </Box>
        </>
      )}
      {viewer !== null && (
        <PhotoViewer photos={photos} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
      )}
    </Screen>
  );
}
