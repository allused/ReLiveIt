import { useState, type ReactNode } from 'react';
import Close from '@mui/icons-material/Close';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { GuestWedding } from '../api/types';
import { useT } from '../i18n';

function HelpSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack spacing={1} sx={{ mb: 2.5 }}>
      <Typography variant="h3">{title}</Typography>
      {children}
    </Stack>
  );
}

export function VoteHelpFab({
  categories,
  maxGalleryPhotos,
}: {
  categories: GuestWedding['categories'];
  maxGalleryPhotos: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Fab
        size="medium"
        aria-label={t('guest.voteHelp.open')}
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          right: 16,
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          zIndex: 1200,
          bgcolor: 'secondary.main',
          color: 'secondary.contrastText',
          boxShadow: '0 8px 24px rgba(43, 36, 24, 0.22)',
          '&:hover': { bgcolor: 'secondary.dark' },
        }}
      >
        <InfoOutlined />
      </Fab>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          {t('guest.voteHelp.title')}
          <IconButton
            aria-label={t('common.close')}
            onClick={() => setOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2.5 }}>{t('guest.voteHelp.intro')}</Typography>

          <HelpSection title={t('guest.voteHelp.galleryTitle')}>
            <Typography>{t('guest.voteHelp.galleryBody1')}</Typography>
            <Typography>{t('guest.voteHelp.galleryBody2', { max: maxGalleryPhotos })}</Typography>
            <Typography>{t('guest.voteHelp.galleryBody3')}</Typography>
          </HelpSection>

          <HelpSection title={t('guest.voteHelp.contestTitle')}>
            <Typography>{t('guest.voteHelp.contestBody')}</Typography>
            <Typography sx={{ mt: 0.5 }}>{t('guest.voteHelp.listTitle')}</Typography>
            {categories.length ? (
              <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 2.5 }}>
                {categories.map((category) => (
                  <Typography component="li" key={category.id}>
                    {category.name}
                  </Typography>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">{t('guest.voteHelp.empty')}</Typography>
            )}
          </HelpSection>

          <HelpSection title={t('guest.voteHelp.voteTitle')}>
            <Typography>{t('guest.voteHelp.voteBody')}</Typography>
            <Typography>{t('guest.voteHelp.swipeRight')}</Typography>
            <Typography>{t('guest.voteHelp.swipeLeft')}</Typography>
            <Typography>{t('guest.voteHelp.noSelfVote')}</Typography>
            <Typography>{t('guest.voteHelp.separateWinners')}</Typography>
          </HelpSection>
        </DialogContent>
      </Dialog>
    </>
  );
}
