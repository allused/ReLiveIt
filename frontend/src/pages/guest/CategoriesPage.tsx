import HowToVoteOutlined from '@mui/icons-material/HowToVoteOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { mediaUrl } from '../../api/client';
import { useGuestWedding } from '../../api/hooks';
import { AppButton, Screen } from '../../components/ui';
import { useT } from '../../i18n';

export function CategoriesPage() {
  const { slug } = useParams();
  const { data: wedding } = useGuestWedding(slug);
  const t = useT();
  const categories = wedding?.categories ?? [];
  const concluded = wedding?.status === 'CONCLUDED';

  return (
    <Screen>
      <Typography variant="h1">{t('guest.categories.title')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {t('guest.categories.body')}
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 3 }}>
        {categories.map((category) => {
          const preview = category.previewPhoto ?? category.myPhoto;
          return (
            <Card key={category.id}>
              <Stack spacing={1.5} sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  {preview ? (
                    <Avatar
                      src={mediaUrl(preview.id, 'thumb')}
                      variant="rounded"
                      sx={{ width: 64, height: 64, borderRadius: 3 }}
                    />
                  ) : (
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 3,
                        bgcolor: 'background.default',
                        color: 'secondary.main',
                      }}
                    >
                      <HowToVoteOutlined />
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h2">{category.name}</Typography>
                  </Box>
                </Stack>
                <AppButton
                  tone="gold"
                  fullWidth
                  component={RouterLink}
                  to={`/wedding/${slug}/categories/${category.id}`}
                >
                  {concluded ? t('guest.categories.gallery') : t('guest.categories.vote')}
                </AppButton>
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Screen>
  );
}
