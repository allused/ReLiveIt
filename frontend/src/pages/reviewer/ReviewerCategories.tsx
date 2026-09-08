import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useReviewerCategories, useReviewerCategoryPhotos } from '../../api/hooks';
import { PhotoGrid } from '../../components/PhotoGrid';
import { PhotoViewer } from '../../components/PhotoViewer';
import { AppButton, Screen } from '../../components/ui';
import { useT } from '../../i18n';

export function ReviewerCategories() {
  const { weddingId, categoryId } = useParams();
  const { data: categories = [] } = useReviewerCategories(weddingId);
  const photosQuery = useReviewerCategoryPhotos(weddingId, categoryId);
  const [viewer, setViewer] = useState<number | null>(null);
  const t = useT();
  const photos = photosQuery.data?.items ?? [];

  if (!categoryId) {
    return (
      <Screen>
        <AppButton tone="ghost" component={RouterLink} to={`/reviewer/${weddingId}`} sx={{ mb: 1 }}>
          {t('common.dashboard')}
        </AppButton>
        <Typography variant="h1">{t('reviewer.categories.title')}</Typography>
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
        {t('reviewer.categories.all')}
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
