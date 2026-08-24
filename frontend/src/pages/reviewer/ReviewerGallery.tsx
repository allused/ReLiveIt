import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Photo } from '../../api/types';
import { PhotoGrid } from '../../components/PhotoGrid';
import { PhotoViewer } from '../../components/PhotoViewer';
import { AppButton, Screen } from '../../components/ui';

export function ReviewerGallery() {
  const { weddingId } = useParams();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => {
    if (!weddingId) return;
    void api<{ items: Photo[]; total: number }>(`/reviewer/weddings/${weddingId}/photos?page=${page}`).then((data) => {
      setPhotos((curr) => (page === 1 ? data.items : [...curr, ...data.items]));
      setTotal(data.total);
    });
  }, [page, weddingId]);

  return (
    <Screen>
      <AppButton tone="ghost" component={RouterLink} to={`/reviewer/${weddingId}`} sx={{ mb: 1 }}>
        Dashboard
      </AppButton>
      <Typography variant="h1">Gallery</Typography>
      <Box sx={{ mt: 3 }}>
        <PhotoGrid photos={photos} onOpen={setViewer} />
      </Box>
      {photos.length < total && (
        <AppButton tone="ghost" fullWidth sx={{ mt: 3 }} onClick={() => setPage((p) => p + 1)}>
          Load more
        </AppButton>
      )}
      {viewer !== null && (
        <PhotoViewer photos={photos} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
      )}
    </Screen>
  );
}
