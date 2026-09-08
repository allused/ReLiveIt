import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useParams, useSearchParams } from 'react-router-dom';
import { ApiError, mediaUrl } from '../../api/client';
import { translateError } from '../../i18n';
import { useDeleteCategoryPhoto, useGuestWedding, useUploadGalleryBatch, useUploadPhoto } from '../../api/hooks';
import { ReplaceCategoryPhotoDialog } from '../../components/ReplaceCategoryPhotoDialog';
import { AppButton, AppCard, AppTextField, ErrorText, Screen } from '../../components/ui';
import { IMAGE_ACCEPT } from '../../constants';
import { useT } from '../../i18n';

type Item = {
  file: File;
  preview: string;
  previewFailed?: boolean;
  status: 'pending' | 'uploading' | 'done' | 'error';
  message?: string;
};

export function UploadPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { data: wedding } = useGuestWedding(slug);
  const uploadPhoto = useUploadPhoto();
  const uploadBatch = useUploadGalleryBatch();
  const deletePhoto = useDeleteCategoryPhoto();
  const t = useT();
  const [mode, setMode] = useState<'category' | 'gallery'>('category');
  const [categoryId, setCategoryId] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceError, setReplaceError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetSelection = () => {
    setItems((curr) => {
      curr.forEach((item) => URL.revokeObjectURL(item.preview));
      return [];
    });
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    const fromQuery = searchParams.get('category');
    if (fromQuery) {
      setMode('category');
      setCategoryId(fromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!categoryId && wedding?.categories[0]) {
      setCategoryId(wedding.categories[0].id);
    }
  }, [categoryId, wedding]);

  const selectedCategory = wedding?.categories.find((c) => c.id === categoryId);
  const concluded = wedding?.status === 'CONCLUDED';
  const hasCategoryPhoto = mode === 'category' && Boolean(selectedCategory?.myPhoto);

  const confirmReplace = async () => {
    if (!slug || !selectedCategory?.myPhoto) return;
    setReplaceError('');
    try {
      await deletePhoto.mutateAsync({ slug, photoId: selectedCategory.myPhoto.id });
      setReplaceOpen(false);
    } catch (err) {
      setReplaceError(
        err instanceof ApiError || err instanceof Error ? err.message : t('guest.upload.replaceFailed'),
      );
    }
  };

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
          await uploadPhoto.mutateAsync({ slug, form });
          resetSelection();
          continue;
        } else {
          const form = new FormData();
          form.append('files', item.file);
          const result = await uploadBatch.mutateAsync({ slug, form });
          if (result.failed.length) {
            throw new Error(translateError(result.failed[0].message));
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
                  message: err instanceof ApiError || err instanceof Error ? err.message : t('guest.upload.failed'),
                }
              : row,
          ),
        );
      }
    }
  };

  if (concluded) {
    return (
      <Screen>
        <Typography variant="h1">{t('guest.upload.closedTitle')}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          {t('guest.upload.closedBody')}
        </Typography>
      </Screen>
    );
  }

  return (
    <Screen>
      <Typography variant="h1">{t('guest.upload.title')}</Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={mode}
        onChange={(_, value: 'category' | 'gallery' | null) => {
          if (!value || value === mode) return;
          resetSelection();
          setMode(value);
        }}
        sx={{ mt: 2 }}
      >
        <ToggleButton value="gallery">{t('guest.upload.gallery')}</ToggleButton>
        <ToggleButton value="category">{t('guest.upload.category')}</ToggleButton>
      </ToggleButtonGroup>

      {mode === 'category' && (
        <AppCard sx={{ mt: 2 }}>
          <AppTextField
            select
            label={t('guest.upload.chooseCategory')}
            value={categoryId}
            onChange={(e) => {
              const next = e.target.value;
              if (next === categoryId) return;
              resetSelection();
              setReplaceOpen(false);
              setReplaceError('');
              setCategoryId(next);
            }}
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
                key={selectedCategory.myPhoto.id}
                component="img"
                src={mediaUrl(selectedCategory.myPhoto.id, 'thumb')}
                alt=""
                sx={{ width: 96, height: 96, borderRadius: 3, objectFit: 'cover' }}
              />
              <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                {t('guest.upload.alreadyInCategory')}
              </Typography>
              <AppButton
                tone="gold"
                fullWidth
                sx={{ mt: 1.5 }}
                onClick={() => {
                  setReplaceError('');
                  setReplaceOpen(true);
                }}
              >
                {t('guest.upload.replacePhoto')}
              </AppButton>
            </Box>
          )}
        </AppCard>
      )}

      {mode === 'gallery' && (
        <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>
          {t('guest.upload.galleryCount', {
            current: wedding?.galleryCount ?? 0,
            max: wedding?.maxGalleryPhotos ?? 30,
          })}
        </Typography>
      )}

      {!hasCategoryPhoto && (
        <>
          <AppButton tone="gold" fullWidth component="label" sx={{ mt: 2 }}>
            {t('guest.upload.selectPhotos')}
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept={IMAGE_ACCEPT}
              multiple={mode === 'gallery'}
              onChange={(e) => onFiles(e.target.files)}
            />
          </AppButton>

          <ImageList cols={3} gap={8} sx={{ mt: 2 }}>
            {items.map((item) => (
              <ImageListItem key={item.preview} sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper' }}>
                {item.previewFailed ? (
                  <Box
                    sx={{
                      aspectRatio: '1 / 1',
                      display: 'grid',
                      placeItems: 'center',
                      px: 1,
                      bgcolor: 'secondary.light',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                      {t('guest.upload.iphonePhoto')}
                    </Typography>
                  </Box>
                ) : (
                  <img
                    src={item.preview}
                    alt=""
                    style={{ aspectRatio: '1 / 1', objectFit: 'cover' }}
                    onError={() =>
                      setItems((curr) =>
                        curr.map((row) => (row.preview === item.preview ? { ...row, previewFailed: true } : row)),
                      )
                    }
                  />
                )}
                <Chip
                  size="small"
                  label={t(`uploadStatus.${item.status}`)}
                  sx={{ position: 'absolute', bottom: 6, left: 6, bgcolor: 'primary.main', color: 'primary.contrastText' }}
                />
              </ImageListItem>
            ))}
          </ImageList>
          {items.some((item) => item.status === 'error') && (
            <Typography color="error" variant="body2" sx={{ mt: 1.5 }}>
              {t('guest.upload.retry', {
                message: items.find((item) => item.status === 'error')?.message ?? '',
              })}
            </Typography>
          )}
          <ErrorText>{error}</ErrorText>
          <AppButton fullWidth sx={{ mt: 2 }} onClick={() => void upload()} disabled={!items.length}>
            {t('guest.upload.uploadPhotos')}
          </AppButton>
        </>
      )}
      <ReplaceCategoryPhotoDialog
        open={replaceOpen}
        error={replaceError}
        loading={deletePhoto.isPending}
        onClose={() => setReplaceOpen(false)}
        onConfirm={() => void confirmReplace()}
      />
    </Screen>
  );
}
