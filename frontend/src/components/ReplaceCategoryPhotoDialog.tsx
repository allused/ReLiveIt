import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { AppButton, ErrorText } from './ui';
import { useT } from '../i18n';

export function ReplaceCategoryPhotoDialog({
  open,
  error,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  error?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useT();

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth>
      <DialogTitle>{t('guest.upload.replaceTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('guest.upload.replaceBody')}</DialogContentText>
        <ErrorText>{error}</ErrorText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton tone="ghost" onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </AppButton>
        <AppButton tone="danger" onClick={onConfirm} disabled={loading}>
          {t('guest.upload.replaceConfirm')}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
