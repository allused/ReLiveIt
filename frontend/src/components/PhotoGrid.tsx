import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import { mediaUrl } from '../api/client';
import type { Photo } from '../api/types';

export function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: Photo[];
  onOpen: (index: number) => void;
}) {
  return (
    <ImageList cols={4} gap={6} sx={{ m: 0 }}>
      {photos.map((photo, index) => (
        <ImageListItem
          key={photo.id}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: 'action.hover',
          }}
        >
          <button
            type="button"
            onClick={() => onOpen(index)}
            aria-label={`Open photo ${index + 1}`}
            style={{
              display: 'block',
              width: '100%',
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <img
              src={mediaUrl(photo.id, 'thumb')}
              alt=""
              loading="lazy"
              style={{ aspectRatio: '4 / 5', objectFit: 'cover', width: '100%' }}
            />
          </button>
        </ImageListItem>
      ))}
    </ImageList>
  );
}

