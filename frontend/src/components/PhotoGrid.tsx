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
    <ImageList cols={2} gap={8} sx={{ m: 0 }}>
      {photos.map((photo, index) => (
        <ImageListItem
          key={photo.id}
          onClick={() => onOpen(index)}
          sx={{ borderRadius: 3, overflow: 'hidden', cursor: 'pointer', bgcolor: 'action.hover' }}
        >
          <img
            src={mediaUrl(photo.id, 'thumb')}
            alt=""
            loading="lazy"
            style={{ aspectRatio: '4 / 5', objectFit: 'cover', width: '100%' }}
          />
        </ImageListItem>
      ))}
    </ImageList>
  );
}
