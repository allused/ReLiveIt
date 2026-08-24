import { useEffect, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { api, mediaUrl } from '../../api/client';
import type { Category, GuestWedding } from '../../api/types';
import { Screen } from '../../components/ui';

export function CategoriesPage() {
  const { slug } = useParams();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!slug) return;
    void api<GuestWedding>(`/weddings/${slug}`).then((data) => setCategories(data.categories));
  }, [slug]);

  return (
    <Screen>
      <Typography variant="h1">Categories</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Open a category to vote, or see your photo.
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 3 }}>
        {categories.map((category) => (
          <Card key={category.id}>
            <CardActionArea component={RouterLink} to={`/wedding/${slug}/categories/${category.id}`}>
              <Stack direction="row" spacing={2} sx={{ p: 2, alignItems: 'center' }}>
                {category.myPhoto ? (
                  <Avatar
                    src={mediaUrl(category.myPhoto.id, 'thumb')}
                    variant="rounded"
                    sx={{ width: 64, height: 64, borderRadius: 3 }}
                  />
                ) : (
                  <Avatar variant="rounded" sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: 'background.default', color: 'secondary.main' }}>
                    +
                  </Avatar>
                )}
                <Box>
                  <Typography variant="h2">{category.name}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {category.myPhoto ? 'Your photo is in' : 'Add one photo, then vote'}
                  </Typography>
                </Box>
              </Stack>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Screen>
  );
}
