import { useState } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { mediaUrl } from '../../api/client';
import { useTimeline } from '../../api/hooks';
import type { Photo } from '../../api/types';
import { PhotoViewer } from '../../components/PhotoViewer';
import { AppButton, Screen } from '../../components/ui';
import { getDateLocale, useT } from '../../i18n';

const burgundy = '#6B2D3C';

export function TimelinePage() {
  const { weddingId } = useParams();
  const { data } = useTimeline(weddingId);
  const [viewer, setViewer] = useState<number | null>(null);
  const t = useT();
  const items = data?.items ?? [];
  const flat = items.flatMap((item) => (item.type === 'photos' ? item.photos : []));

  return (
    <Screen>
      <AppButton tone="ghost" component={RouterLink} to={`/reviewer/${weddingId}`} sx={{ mb: 1 }}>
        {t('common.dashboard')}
      </AppButton>
      <Typography variant="h1">{t('reviewer.timeline.title')}</Typography>
      {items.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          {t('reviewer.timeline.empty')}
        </Typography>
      )}
      <Stack spacing={3} sx={{ mt: 4 }}>
        {items.map((item, index) => {
          if (item.type === 'photos' && items[index - 1]?.type === 'event') {
            return null;
          }
          if (item.type === 'event') {
            const next = items[index + 1];
            const photos = next?.type === 'photos' ? next.photos : [];
            return (
              <Box key={item.event.id} component="section">
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline' }}>
                  <TimeLabel>{formatMinute(item.event.occursAt)}</TimeLabel>
                  <Typography sx={{ fontWeight: 700, lineHeight: 1.2, color: burgundy }}>
                    {item.event.title}
                  </Typography>
                </Stack>
                <Divider sx={{ mt: 1, mb: 1.5 }} />
                {photos.length > 0 && <PhotoHourGrid photos={photos} flat={flat} onOpen={setViewer} />}
              </Box>
            );
          }
          return (
            <Box key={`${item.label}-${item.photos[0]?.id ?? index}`} component="section">
              <TimeLabel>{item.label}</TimeLabel>
              <Divider sx={{ mt: 1, mb: 1.5 }} />
              <PhotoHourGrid photos={item.photos} flat={flat} onOpen={setViewer} />
            </Box>
          );
        })}
      </Stack>
      {viewer !== null && (
        <PhotoViewer photos={flat} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
      )}
    </Screen>
  );
}

function PhotoHourGrid({
  photos,
  flat,
  onOpen,
}: {
  photos: Photo[];
  flat: Photo[];
  onOpen: (index: number) => void;
}) {
  return (
    <ImageList cols={4} gap={4} sx={{ m: 0 }}>
      {photos.map((photo) => {
        const index = flat.findIndex((p) => p.id === photo.id);
        return (
          <ImageListItem
            key={photo.id}
            onClick={() => onOpen(index)}
            sx={{ borderRadius: 1.5, overflow: 'hidden', cursor: 'pointer' }}
          >
            <img
              src={mediaUrl(photo.id, 'thumb')}
              alt=""
              style={{ aspectRatio: '4 / 5', objectFit: 'cover', width: '100%' }}
            />
          </ImageListItem>
        );
      })}
    </ImageList>
  );
}

function TimeLabel({ children }: { children: string }) {
  return (
    <Typography variant="overline" sx={{ color: burgundy, letterSpacing: '0.28em' }}>
      {children}
    </Typography>
  );
}

function formatMinute(iso: string) {
  return new Date(iso).toLocaleTimeString(getDateLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
