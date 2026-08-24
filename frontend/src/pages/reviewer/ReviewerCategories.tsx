import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Category, Photo } from '../../api/types';
import { PhotoGrid } from '../../components/PhotoGrid';
import { PhotoViewer } from '../../components/PhotoViewer';
import { AppButton, Screen } from '../../components/ui';

export function ReviewerCategories() {
  const { weddingId, categoryId } = useParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => {
    if (!weddingId) return;
    void api<Category[]>(`/reviewer/weddings/${weddingId}/categories`).then(setCategories);
  }, [weddingId]);

  useEffect(() => {
    if (!weddingId || !categoryId) return;
    void api<{ items: Photo[] }>(`/reviewer/weddings/${weddingId}/photos?categoryId=${categoryId}&limit=60`).then(
      (data) => setPhotos(data.items),
    );
  }, [categoryId, weddingId]);

  if (!categoryId) {
    return (
      <Screen>
        <AppButton tone="ghost" component={RouterLink} to={`/reviewer/${weddingId}`} sx={{ mb: 1 }}>
          Dashboard
        </AppButton>
        <Typography variant="h1">Categories</Typography>
        <Stack spacing={1.5} sx={{ mt: 3 }}>
          {categories.map((category) => (
            <Card key={category.id}>
              <CardActionArea component={RouterLink} to={`/reviewer/${weddingId}/categories/${category.id}`}>
                <CardContent>
                  <Typography variant="h2">{category.name}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Screen>
    );
  }

  const current = categories.find((c) => c.id === categoryId);

  return (
    <Screen>
      <AppButton tone="ghost" component={RouterLink} to={`/reviewer/${weddingId}/categories`} sx={{ mb: 1 }}>
        All categories
      </AppButton>
      <Typography variant="h1">{current?.name}</Typography>
      <Box sx={{ mt: 3 }}>
        <PhotoGrid photos={photos} onOpen={setViewer} />
      </Box>
      {viewer !== null && (
        <PhotoViewer photos={photos} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
      )}
    </Screen>
  );
}
