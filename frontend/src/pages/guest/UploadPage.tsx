import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useParams } from 'react-router-dom';
import { api, ApiError, mediaUrl } from '../../api/client';
import type { GuestWedding } from '../../api/types';
import { AppButton, AppCard, AppTextField, ErrorText, Screen } from '../../components/ui';

type Item = {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  message?: string;
};

export function UploadPage() {
  const { slug } = useParams();
  const [wedding, setWedding] = useState<GuestWedding | null>(null);
  const [mode, setMode] = useState<'category' | 'gallery'>('gallery');
  const [categoryId, setCategoryId] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');

  const load = () => {
    if (!slug) return;
    void api<GuestWedding>(`/weddings/${slug}`).then((data) => {
      setWedding(data);
      if (!categoryId && data.categories[0]) {
        setCategoryId(data.categories[0].id);
      }
    });
  };

  useEffect(() => {
    load();
  }, [slug]);

  const selectedCategory = wedding?.categories.find((c) => c.id === categoryId);
  const concluded = wedding?.status === 'CONCLUDED';

  const onFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const next = Array.from(fileList).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }));
    setItems(mode === 'category' ? next.slice(0, 1) : [...items, ...next]);
  };

  const upload = async () => {
    if (!slug) return;
    setError('');
    const pending = items.filter((item) => item.status === 'pending' || item.status === 'error');
    for (const item of pending) {
      setItems((curr) => curr.map((row) => (row.preview === item.preview ? { ...row, status: 'uploading' } : row)));
      try {
        if (mode === 'category') {
          const form = new FormData();
          form.append('file', item.file);
          form.append('categoryId', categoryId);
          await api(`/weddings/${slug}/photos`, { method: 'POST', body: form });
        } else {
          const form = new FormData();
          form.append('files', item.file);
          const result = await api<{ failed: { filename: string; message: string }[] }>(
            `/weddings/${slug}/photos/batch`,
            { method: 'POST', body: form },
          );
          if (result.failed.length) {
            throw new Error(result.failed[0].message);
          }
        }
        setItems((curr) => curr.map((row) => (row.preview === item.preview ? { ...row, status: 'done' } : row)));
      } catch (err) {
        setItems((curr) =>
          curr.map((row) =>
            row.preview === item.preview
              ? {
                  ...row,
                  status: 'error',
                  message: err instanceof ApiError || err instanceof Error ? err.message : 'Upload failed.',
                }
              : row,
          ),
        );
      }
    }
    load();
  };

  if (concluded) {
    return (
      <Screen>
        <Typography variant="h1">Uploads closed</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          This wedding has already concluded. Uploads are no longer available.
        </Typography>
      </Screen>
    );
  }

  return (
    <Screen>
      <Typography variant="h1">Upload</Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={mode}
        onChange={(_, value: 'category' | 'gallery' | null) => {
          if (value) setMode(value);
        }}
        sx={{ mt: 2 }}
      >
        <ToggleButton value="gallery">Gallery</ToggleButton>
        <ToggleButton value="category">Category</ToggleButton>
      </ToggleButtonGroup>

      {mode === 'category' && (
        <AppCard sx={{ mt: 2 }}>
          <AppTextField
            select
            label="Choose category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {wedding?.categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </AppTextField>
          {selectedCategory?.myPhoto && (
            <Box sx={{ mt: 2 }}>
              <Box
                component="img"
                src={mediaUrl(selectedCategory.myPhoto.id, 'thumb')}
                alt=""
                sx={{ width: 96, height: 96, borderRadius: 3, objectFit: 'cover' }}
              />
              <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                You have already uploaded a photo to this category.
              </Typography>
            </Box>
          )}
        </AppCard>
      )}

      {mode === 'gallery' && (
        <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>
          {wedding?.galleryCount ?? 0} / {wedding?.maxGalleryPhotos ?? 30} general photos
        </Typography>
      )}

      <AppButton tone="gold" fullWidth component="label" sx={{ mt: 2 }}>
        Select photos
        <input
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp"
          multiple={mode === 'gallery'}
          onChange={(e) => onFiles(e.target.files)}
        />
      </AppButton>

      <ImageList cols={3} gap={8} sx={{ mt: 2 }}>
        {items.map((item) => (
          <ImageListItem key={item.preview} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <img src={item.preview} alt="" style={{ aspectRatio: '1 / 1', objectFit: 'cover' }} />
            <Chip
              size="small"
              label={item.status}
              sx={{ position: 'absolute', bottom: 6, left: 6, bgcolor: 'primary.main', color: 'primary.contrastText' }}
            />
          </ImageListItem>
        ))}
      </ImageList>
      {items.some((item) => item.status === 'error') && (
        <Typography color="error" variant="body2" sx={{ mt: 1.5 }}>
          {items.find((item) => item.status === 'error')?.message} You can retry failed photos.
        </Typography>
      )}
      <ErrorText>{error}</ErrorText>
      <AppButton fullWidth sx={{ mt: 2 }} onClick={() => void upload()} disabled={!items.length}>
        Upload photos
      </AppButton>
    </Screen>
  );
}
