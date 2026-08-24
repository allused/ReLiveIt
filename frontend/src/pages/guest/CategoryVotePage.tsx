import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { api, mediaUrl } from '../../api/client';
import type { Category, GuestWedding, Photo } from '../../api/types';
import { PhotoGrid } from '../../components/PhotoGrid';
import { PhotoViewer } from '../../components/PhotoViewer';
import { AppButton, EmptyState, Screen } from '../../components/ui';
import { VoteDeck } from '../../components/VoteDeck';

export function CategoryVotePage() {
  const { slug, categoryId } = useParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [queue, setQueue] = useState<Photo[] | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [viewer, setViewer] = useState<number | null>(null);
  const [concluded, setConcluded] = useState(false);

  useEffect(() => {
    if (!slug || !categoryId) return;
    void api<GuestWedding>(`/weddings/${slug}`).then((wedding) => {
      setConcluded(wedding.status === 'CONCLUDED');
      setCategory(wedding.categories.find((c) => c.id === categoryId) ?? null);
    });
    void api<{ items: Photo[] }>(`/weddings/${slug}/photos?categoryId=${categoryId}&limit=60`).then((data) =>
      setPhotos(data.items),
    );
  }, [categoryId, slug]);

  const startVote = async () => {
    if (!slug || !categoryId) return;
    const data = await api<{ photos: Photo[] }>(`/weddings/${slug}/categories/${categoryId}/vote-queue`);
    setQueue(data.photos);
    setDone(null);
  };

  return (
    <Screen>
      <AppButton tone="ghost" component={RouterLink} to={`/wedding/${slug}/categories`} sx={{ mb: 1 }}>
        All categories
      </AppButton>
      <Typography variant="h1">{category?.name}</Typography>
      {category?.myPhoto && (
        <Box sx={{ mt: 2, overflow: 'hidden', borderRadius: 4 }}>
          <Box
            component="img"
            src={mediaUrl(category.myPhoto.id, 'medium')}
            alt="Your category photo"
            sx={{ width: '100%', display: 'block' }}
          />
          <Typography color="text.secondary" variant="body2" sx={{ mt: 1.5 }}>
            You have already uploaded a photo to this category.
          </Typography>
        </Box>
      )}
      {!concluded && queue === null && done === null && (
        <AppButton fullWidth sx={{ mt: 3 }} onClick={() => void startVote()}>
          Vote in this category
        </AppButton>
      )}
      {queue && done === null && (
        <Box sx={{ mt: 3 }}>
          {queue.length === 0 ? (
            <EmptyState title="You're caught up" body="No more photos to vote on here." />
          ) : (
            <VoteDeck photos={queue} onDone={setDone} />
          )}
        </Box>
      )}
      {done !== null && (
        <Box sx={{ mt: 3 }}>
          <EmptyState title="Nice work" body={`You voted on ${done} photo${done === 1 ? '' : 's'}.`} />
        </Box>
      )}
      <Typography variant="h2" sx={{ mt: 5 }}>
        Gallery
      </Typography>
      <Box sx={{ mt: 2 }}>
        <PhotoGrid photos={photos} onOpen={setViewer} />
      </Box>
      {viewer !== null && (
        <PhotoViewer photos={photos} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
      )}
    </Screen>
  );
}
