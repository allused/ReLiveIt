import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Photo } from '../../api/types';
import { PhotoGrid } from '../../components/PhotoGrid';
import { PhotoViewer } from '../../components/PhotoViewer';
import { AppButton, EmptyState, Screen } from '../../components/ui';

export function GuestGalleryPage() {
  const { slug } = useParams();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    void api<{ items: Photo[]; total: number }>(`/weddings/${slug}/photos?page=${page}&limit=24`).then((data) => {
      setPhotos((curr) => (page === 1 ? data.items : [...curr, ...data.items]));
      setTotal(data.total);
    });
  }, [page, slug]);

  return (
    <Screen>
      <Typography variant="h1">Gallery</Typography>
      {photos.length === 0 ? (
        <Box sx={{ mt: 4 }}>
          <EmptyState title="No photos yet" body="Be the first to upload a moment from the evening." />
        </Box>
      ) : (
        <Box sx={{ mt: 3 }}>
          <PhotoGrid photos={photos} onOpen={setViewer} />
          {photos.length < total && (
            <AppButton tone="ghost" fullWidth sx={{ mt: 3 }} onClick={() => setPage((p) => p + 1)}>
              Load more
            </AppButton>
          )}
        </Box>
      )}
      {viewer !== null && (
        <PhotoViewer photos={photos} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
      )}
    </Screen>
  );
}
