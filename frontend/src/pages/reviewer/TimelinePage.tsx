import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { api, mediaUrl } from '../../api/client';
import type { Photo } from '../../api/types';
import { PhotoViewer } from '../../components/PhotoViewer';
import { AppButton, Eyebrow, Screen } from '../../components/ui';

type Group = { label: string; photos: Photo[] };

export function TimelinePage() {
  const { weddingId } = useParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [flat, setFlat] = useState<Photo[]>([]);
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => {
    if (!weddingId) return;
    void api<{ groups: Group[] }>(`/reviewer/weddings/${weddingId}/timeline`).then((data) => {
      setGroups(data.groups);
      setFlat(data.groups.flatMap((g) => g.photos));
    });
  }, [weddingId]);

  return (
    <Screen>
      <AppButton tone="ghost" component={RouterLink} to={`/reviewer/${weddingId}`} sx={{ mb: 1 }}>
        Dashboard
      </AppButton>
      <Typography variant="h1">Timeline</Typography>
      <Stack spacing={4} sx={{ mt: 4 }}>
        {groups.map((group) => (
          <Box key={group.label} component="section">
            <Eyebrow>{group.label}</Eyebrow>
            <Divider sx={{ mt: 1, mb: 2 }} />
            <ImageList cols={2} gap={8} sx={{ m: 0 }}>
              {group.photos.map((photo) => {
                const index = flat.findIndex((p) => p.id === photo.id);
                return (
                  <ImageListItem
                    key={photo.id}
                    onClick={() => setViewer(index)}
                    sx={{ borderRadius: 3, overflow: 'hidden', cursor: 'pointer' }}
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
          </Box>
        ))}
      </Stack>
      {viewer !== null && (
        <PhotoViewer photos={flat} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
      )}
    </Screen>
  );
}
