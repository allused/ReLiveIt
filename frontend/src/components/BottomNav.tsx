import HomeOutlined from '@mui/icons-material/HomeOutlined';
import HowToVoteOutlined from '@mui/icons-material/HowToVoteOutlined';
import PhotoLibraryOutlined from '@mui/icons-material/PhotoLibraryOutlined';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import AddAPhotoOutlined from '@mui/icons-material/AddAPhotoOutlined';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import { useLocation, useNavigate } from 'react-router-dom';
import { useT } from '../i18n';

export function BottomNav({ slug, quickVoteEnabled }: { slug: string; quickVoteEnabled: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const items = [
    { to: '', label: t('nav.home'), icon: <HomeOutlined /> },
    { to: 'categories', label: t('nav.vote'), icon: <HowToVoteOutlined /> },
    { to: 'gallery', label: t('nav.gallery'), icon: <PhotoLibraryOutlined /> },
    ...(quickVoteEnabled ? [{ to: 'quick-vote', label: t('nav.quickVote'), icon: <FavoriteBorder /> }] : []),
    { to: 'upload', label: t('nav.upload'), icon: <AddAPhotoOutlined /> },
  ];
  const current =
    items.find((item) => {
      const path = item.to ? `/wedding/${slug}/${item.to}` : `/wedding/${slug}`;
      return item.to === ''
        ? location.pathname === `/wedding/${slug}`
        : location.pathname.startsWith(path);
    })?.to ?? '';

  return (
    <Paper
      component="nav"
      elevation={0}
      sx={{
        flexShrink: 0,
        bgcolor: 'background.default',
        borderTop: 1,
        borderColor: 'divider',
        boxShadow: '0 -8px 24px rgba(43, 36, 24, 0.06)',
        pb: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      <BottomNavigation
        showLabels
        value={current}
        onChange={(_, value: string) => {
          navigate(value ? `/wedding/${slug}/${value}` : `/wedding/${slug}`);
        }}
        sx={{ maxWidth: 480, mx: 'auto', bgcolor: 'transparent', height: 64 }}
      >
        {items.map((item) => (
          <BottomNavigationAction key={item.label} value={item.to} label={item.label} icon={item.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
