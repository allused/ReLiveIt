import { useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Close from '@mui/icons-material/Close';
import { mediaUrl } from '../api/client';
import type { Photo } from '../api/types';

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
  const startX = useRef<number | null>(null);
  const photo = photos[index];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onChange(Math.min(photos.length - 1, index + 1));
      if (event.key === 'ArrowLeft') onChange(Math.max(0, index - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, onChange, onClose, photos.length]);

  if (!photo) return null;

  return (
    <Dialog
      open
      fullScreen
      onClose={onClose}
      slotProps={{ paper: { sx: { bgcolor: 'rgba(43,36,24,0.94)' } } }}
    >
      <IconButton
        onClick={onClose}
        sx={{ position: 'absolute', top: 12, right: 12, color: 'secondary.contrastText', zIndex: 1 }}
        aria-label="Close"
      >
        <Close />
      </IconButton>
      <img
        src={mediaUrl(photo.id, 'medium')}
        alt=""
        style={{ maxHeight: '100dvh', maxWidth: '100%', objectFit: 'contain', margin: 'auto' }}
        onPointerDown={(event) => {
          startX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (startX.current == null) return;
          const dx = event.clientX - startX.current;
          startX.current = null;
          if (dx < -50) onChange(Math.min(photos.length - 1, index + 1));
          if (dx > 50) onChange(Math.max(0, index - 1));
        }}
      />
    </Dialog>
  );
}
