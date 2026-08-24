import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { GuestWedding } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { BottomNav } from '../../components/BottomNav';
import { Eyebrow, Screen } from '../../components/ui';

export type GuestOutletContext = { wedding: GuestWedding | null };

export function GuestLayout() {
  const { slug } = useParams();
  const [wedding, setWedding] = useState<GuestWedding | null>(null);

  useEffect(() => {
    if (!slug) return;
    void api<GuestWedding>(`/weddings/${slug}`).then(setWedding);
  }, [slug]);

  return (
    <Box
      sx={{
        height: '100svh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          '& > .MuiContainer-root': { minHeight: 'unset', pb: 3 },
        }}
      >
        <Outlet context={{ wedding } satisfies GuestOutletContext} />
      </Box>
      {slug && <BottomNav slug={slug} quickVoteEnabled={Boolean(wedding?.quickVoteEnabled)} />}
    </Box>
  );
}

export function GuestHome() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { wedding } = useOutletContext<GuestOutletContext>();
  const name = user?.kind === 'participant' ? user.displayName : '';
  const quickVoteEnabled = Boolean(wedding?.quickVoteEnabled);

  return (
    <Screen>
      <Eyebrow>Welcome</Eyebrow>
      <Typography variant="h1">{name}</Typography>
      <Typography color="text.secondary">{wedding?.name}</Typography>
      {user?.kind === 'participant' && user.secondaryName && (
        <Alert severity="info" sx={{ mt: 2, borderRadius: 3 }}>
          This invitation is shared. Uploads and votes belong to both of you.
        </Alert>
      )}
      {wedding?.status === 'CONCLUDED' && (
        <Alert severity="warning" sx={{ mt: 2, borderRadius: 3 }}>
          This wedding has concluded. You can still browse photos.
        </Alert>
      )}
      <Grid container spacing={1.5} sx={{ mt: 3 }}>
        <Grid size={quickVoteEnabled ? 6 : 12}>
          <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', height: '100%' }}>
            <CardActionArea component={RouterLink} to={`/wedding/${slug}/upload`} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h2" color="inherit">
                  Upload
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Add photos
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        {quickVoteEnabled && (
          <Grid size={6}>
            <Card sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', height: '100%' }}>
              <CardActionArea component={RouterLink} to={`/wedding/${slug}/quick-vote`} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h2" color="inherit">
                    Quick Vote
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Swipe a short set
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        )}
        <Grid size={12}>
          <Card>
            <CardActionArea component={RouterLink} to={`/wedding/${slug}/categories`}>
              <CardContent>
                <Typography variant="h2">Categories</Typography>
                <Typography color="text.secondary" variant="body2">
                  Vote by moment
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid size={12}>
          <Card>
            <CardActionArea component={RouterLink} to={`/wedding/${slug}/gallery`}>
              <CardContent>
                <Typography variant="h2">Gallery</Typography>
                <Typography color="text.secondary" variant="body2">
                  Browse every photo
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
      <Box sx={{ height: 8 }} />
    </Screen>
  );
}
