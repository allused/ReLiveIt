import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { coverMediaUrl } from '../../api/client';
import { useGuestWedding } from '../../api/hooks';
import type { GuestWedding } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { BottomNav } from '../../components/BottomNav';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { VoteHelpFab } from '../../components/VoteHelpFab';
import { Eyebrow, Screen } from '../../components/ui';
import { useT } from '../../i18n';
import { rose } from '../../theme';

export type GuestOutletContext = { wedding: GuestWedding | null };

export function GuestLayout() {
  const { slug } = useParams();
  const { data: wedding = null } = useGuestWedding(slug);

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
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          '& > .MuiContainer-root': { minHeight: 'unset', pb: 3 },
        }}
      >
        <Outlet context={{ wedding } satisfies GuestOutletContext} />
      </Box>
      {slug && <BottomNav slug={slug} quickVoteEnabled={Boolean(wedding?.quickVoteEnabled)} />}
      <VoteHelpFab
        categories={wedding?.categories ?? []}
        maxGalleryPhotos={wedding?.maxGalleryPhotos ?? 30}
      />
    </Box>
  );
}

const coverFadeMask =
  'radial-gradient(ellipse 96% 94% at 50% 50%, #000 62%, rgba(0,0,0,0.55) 82%, transparent 97%)';

export function GuestHome() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { wedding } = useOutletContext<GuestOutletContext>();
  const t = useT();
  const name = user?.kind === 'participant' ? user.displayName : '';
  const quickVoteEnabled = Boolean(wedding?.quickVoteEnabled);
  const coverSrc =
    wedding?.hasCoverPhoto && wedding.id
      ? coverMediaUrl(wedding.id, 'medium', wedding.updatedAt)
      : null;

  const header = (overPhoto: boolean) => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <LanguageSwitch light={overPhoto} />
      </Box>
      <Eyebrow>{t('guest.home.welcome')}</Eyebrow>
      <Typography
        variant="h1"
        sx={
          overPhoto
            ? {
                color: '#F6EFE4',
                textShadow: '0 1px 10px rgba(43, 36, 24, 0.55)',
              }
            : undefined
        }
      >
        {name}
      </Typography>
      <Typography
        color={overPhoto ? undefined : 'text.secondary'}
        sx={overPhoto ? { color: '#F6EFE4', opacity: 0.92, textShadow: '0 1px 8px rgba(43, 36, 24, 0.45)' } : undefined}
      >
        {wedding?.name}
      </Typography>
      {user?.kind === 'participant' && user.secondaryName && (
        <Alert severity="info" sx={{ mt: 2, borderRadius: 3 }}>
          {t('guest.home.sharedInvite')}
        </Alert>
      )}
      {wedding?.status === 'CONCLUDED' && (
        <Alert severity="warning" sx={{ mt: 2, borderRadius: 3 }}>
          {t('guest.home.concluded')}
        </Alert>
      )}
    </>
  );

  if (!coverSrc) {
    return (
      <Screen>
        {header(false)}
        <Box sx={{ mt: 3 }}>
          <HomeActions slug={slug} quickVoteEnabled={quickVoteEnabled} />
        </Box>
        <Box sx={{ height: 8 }} />
      </Screen>
    );
  }

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Box
        component="img"
        src={coverSrc}
        alt=""
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          WebkitMaskImage: coverFadeMask,
          maskImage: coverFadeMask,
        }}
      />
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          px: 2.5,
          pt: 3,
          pb: 2,
          maxWidth: 480,
          mx: 'auto',
        }}
      >
        {header(true)}
        <Box sx={{ flex: 1, minHeight: 12 }} />
        <HomeActions slug={slug} quickVoteEnabled={quickVoteEnabled} overPhoto />
      </Box>
    </Box>
  );
}

function HomeActions({
  slug,
  quickVoteEnabled,
  overPhoto = false,
}: {
  slug: string | undefined;
  quickVoteEnabled: boolean;
  overPhoto?: boolean;
}) {
  const t = useT();
  const frost = overPhoto
    ? {
        bgcolor: 'rgba(251, 246, 238, 0.9)',
        backdropFilter: 'blur(12px)',
      }
    : {};

  return (
    <Grid container spacing={1.5}>
      <Grid size={quickVoteEnabled ? 6 : 12}>
        <ActionCard
          to={`/wedding/${slug}/upload`}
          title={t('guest.home.upload')}
          body={t('guest.home.uploadBody')}
          sx={{ bgcolor: rose, color: 'secondary.contrastText' }}
        />
      </Grid>
      {quickVoteEnabled && (
        <Grid size={6}>
          <ActionCard
            to={`/wedding/${slug}/quick-vote`}
            title={t('guest.home.quickVote')}
            body={t('guest.home.quickVoteBody')}
            sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText' }}
          />
        </Grid>
      )}
      <Grid size={12}>
        <ActionCard
          to={`/wedding/${slug}/categories`}
          title={t('guest.home.categories')}
          body={t('guest.home.categoriesBody')}
          sx={frost}
        />
      </Grid>
      <Grid size={12}>
        <ActionCard
          to={`/wedding/${slug}/gallery`}
          title={t('guest.home.gallery')}
          body={t('guest.home.galleryBody')}
          sx={frost}
        />
      </Grid>
    </Grid>
  );
}

function ActionCard({
  to,
  title,
  body,
  sx,
}: {
  to: string;
  title: string;
  body: string;
  sx?: object;
}) {
  return (
    <Card sx={{ height: '100%', ...sx }}>
      <CardActionArea component={RouterLink} to={to} sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h2" color="inherit">
            {title}
          </Typography>
          <Typography variant="body2" color="inherit" sx={{ opacity: 0.8 }}>
            {body}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
