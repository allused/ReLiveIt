import { useState } from 'react';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useParams } from 'react-router-dom';
import { ApiError, downloadFile } from '../../api/client';
import { useGuestGallery } from '../../api/hooks';
import { PhotoGrid } from '../../components/PhotoGrid';
import { PhotoViewer } from '../../components/PhotoViewer';
import { AppButton, EmptyState, Screen } from '../../components/ui';
import { useT } from '../../i18n';

export function GuestGalleryPage() {
  const { slug } = useParams();
  const gallery = useGuestGallery(slug);
  const t = useT();
  const [viewer, setViewer] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const photos = gallery.data?.pages.flatMap((page) => page.items) ?? [];
  const total = gallery.data?.pages.at(-1)?.total ?? 0;

  const downloadAll = async () => {
    if (!slug) return;
    setDownloadError('');
    setDownloading(true);
    try {
      await downloadFile(`/weddings/${slug}/photos/zip`, `${slug}-photos.zip`);
    } catch (error) {
      setDownloadError(error instanceof ApiError ? error.message : t('guest.gallery.downloadFailed'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen>
      <Typography variant="h1">{t('guest.gallery.title')}</Typography>
      {photos.length === 0 ? (
        <Box sx={{ mt: 4 }}>
          <EmptyState title={t('guest.gallery.emptyTitle')} body={t('guest.gallery.emptyBody')} />
        </Box>
      ) : (
        <Box sx={{ mt: 3 }}>
          <AppButton
            tone="ghost"
            fullWidth
            startIcon={<FileDownloadOutlined />}
            onClick={() => void downloadAll()}
            disabled={downloading}
            sx={{ mb: 2 }}
          >
            {downloading ? t('guest.gallery.preparingZip') : t('guest.gallery.downloadAll')}
          </AppButton>
          {downloadError && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {downloadError}
            </Typography>
          )}
          <PhotoGrid photos={photos} onOpen={setViewer} />
          {photos.length < total && (
            <AppButton
              tone="ghost"
              fullWidth
              sx={{ mt: 3 }}
              onClick={() => void gallery.fetchNextPage()}
              disabled={gallery.isFetchingNextPage}
            >
              {t('common.loadMore')}
            </AppButton>
          )}
        </Box>
      )}
      {viewer !== null && (
        <PhotoViewer photos={photos} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
      )}
    </Screen>
  );
}
