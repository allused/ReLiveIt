import { useState } from 'react';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { ApiError, downloadFile } from '../../api/client';
import { useReviewerGallery } from '../../api/hooks';
import { PhotoGrid } from '../../components/PhotoGrid';
import { PhotoViewer } from '../../components/PhotoViewer';
import { AppButton, Screen } from '../../components/ui';
import { useT } from '../../i18n';

export function ReviewerGallery() {
  const { weddingId } = useParams();
  const gallery = useReviewerGallery(weddingId);
  const [viewer, setViewer] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const t = useT();
  const [downloadError, setDownloadError] = useState('');
  const photos = gallery.data?.pages.flatMap((page) => page.items) ?? [];
  const total = gallery.data?.pages.at(-1)?.total ?? 0;

  const downloadAll = async () => {
    if (!weddingId) return;
    setDownloadError('');
    setDownloading(true);
    try {
      await downloadFile(`/reviewer/weddings/${weddingId}/photos/zip`, 'wedding-photos.zip');
    } catch (error) {
      setDownloadError(error instanceof ApiError ? error.message : t('guest.gallery.downloadFailed'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen>
      <AppButton tone="ghost" component={RouterLink} to={`/reviewer/${weddingId}`} sx={{ mb: 1 }}>
        {t('common.dashboard')}
      </AppButton>
      <Typography variant="h1">{t('reviewer.gallery.title')}</Typography>
      {photos.length > 0 && (
        <AppButton
          tone="ghost"
          fullWidth
          startIcon={<FileDownloadOutlined />}
          onClick={() => void downloadAll()}
          disabled={downloading}
          sx={{ mt: 2 }}
        >
          {downloading ? t('guest.gallery.preparingZip') : t('guest.gallery.downloadAll')}
        </AppButton>
      )}
      {downloadError && (
        <Typography color="error" variant="body2" sx={{ mt: 1.5 }}>
          {downloadError}
        </Typography>
      )}
      <Box sx={{ mt: 3 }}>
        <PhotoGrid photos={photos} onOpen={setViewer} />
      </Box>
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
      {viewer !== null && (
        <PhotoViewer photos={photos} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
      )}
    </Screen>
  );
}
