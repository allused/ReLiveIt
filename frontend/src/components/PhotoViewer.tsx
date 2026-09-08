import { useEffect, useRef } from 'react';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { mediaUrl } from '../api/client';
import type { Photo } from '../api/types';
import { useT } from '../i18n';

export function PhotoViewer({
  photos,
  index,
  onClose,
  onChange,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const startX = useRef<number | null>(null);
  const thumbsRef = useRef<HTMLDivElement | null>(null);
  const photo = photos[index];
  const atStart = index <= 0;
  const atEnd = index >= photos.length - 1;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' && !atEnd) onChange(index + 1);
      if (event.key === 'ArrowLeft' && !atStart) onChange(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [atEnd, atStart, index, onChange]);

  useEffect(() => {
    const active = thumbsRef.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`);
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [index]);

  if (!photo) return null;

  const go = (next: number) => {
    if (next < 0 || next >= photos.length) return;
    onChange(next);
  };

  return (
    <Dialog
      open
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      aria-labelledby="photo-viewer-title"
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            backgroundImage: 'none',
            display: 'flex',
            flexDirection: 'column',
            m: fullScreen ? 0 : 2,
            height: fullScreen ? '100%' : 'min(92dvh, 760px)',
            maxHeight: fullScreen ? '100%' : '92dvh',
          },
        },
      }}
    >
      <DialogTitle
        id="photo-viewer-title"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, px: 1.5 }}
      >
        <Typography component="span" sx={{ flex: 1, fontWeight: 500 }}>
          {index + 1} / {photos.length}
        </Typography>
        <IconButton onClick={onClose} aria-label={t('viewer.close')} sx={{ color: 'inherit' }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          position: 'relative',
          p: '0 !important',
          overflow: 'hidden',
          flex: 1,
          minHeight: 0,
        }}
        onPointerDown={(event) => {
          startX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (startX.current == null) return;
          const dx = event.clientX - startX.current;
          startX.current = null;
          if (dx < -50) go(index + 1);
          if (dx > 50) go(index - 1);
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: { xs: 6, sm: 7 },
            py: 1,
          }}
        >
          <IconButton
            aria-label={t('viewer.previous')}
            disabled={atStart}
            onClick={() => go(index - 1)}
            sx={{
              position: 'absolute',
              left: 4,
              zIndex: 1,
              color: 'inherit',
              bgcolor: 'rgba(255,255,255,0.12)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              '&.Mui-disabled': { color: 'inherit', opacity: 0.3 },
            }}
          >
            <ChevronLeft />
          </IconButton>
          <Box
            component="img"
            src={mediaUrl(photo.id, 'medium')}
            alt=""
            draggable={false}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              borderRadius: 1,
            }}
          />
          <IconButton
            aria-label={t('viewer.next')}
            disabled={atEnd}
            onClick={() => go(index + 1)}
            sx={{
              position: 'absolute',
              right: 4,
              zIndex: 1,
              color: 'inherit',
              bgcolor: 'rgba(255,255,255,0.12)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              '&.Mui-disabled': { color: 'inherit', opacity: 0.3 },
            }}
          >
            <ChevronRight />
          </IconButton>
        </Box>
      </DialogContent>
      <DialogActions
        ref={thumbsRef}
        sx={{
          justifyContent: 'center',
          px: 1.5,
          py: 1.5,
          minHeight: 88,
          boxSizing: 'border-box',
          overflowX: 'auto',
          flexShrink: 0,
          bgcolor: 'rgba(0,0,0,0.2)',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, mx: 'auto' }}>
          {photos.map((item, thumbIndex) => (
            <Box
              key={item.id}
              component="button"
              type="button"
              data-thumb={thumbIndex}
              aria-label={`Photo ${thumbIndex + 1}`}
              aria-current={thumbIndex === index ? true : undefined}
              onClick={() => onChange(thumbIndex)}
              sx={{
                p: 0,
                border: '2px solid',
                borderColor: thumbIndex === index ? 'secondary.main' : 'transparent',
                borderRadius: 1,
                overflow: 'hidden',
                width: 52,
                height: 64,
                flexShrink: 0,
                cursor: 'pointer',
                opacity: thumbIndex === index ? 1 : 0.55,
                bgcolor: 'transparent',
              }}
            >
              <Box
                component="img"
                src={mediaUrl(item.id, 'thumb')}
                alt=""
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </Box>
          ))}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
