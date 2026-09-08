import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Close from '@mui/icons-material/Close';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { api, ApiError, coverMediaUrl, downloadFile } from '../../api/client';
import {
  invalidateAdminWedding,
  useAdminCategories,
  useAdminParticipants,
  useAdminTimelineEvents,
  useAdminWedding,
} from '../../api/hooks';
import { queryKeys } from '../../api/keys';
import type { Participant } from '../../api/types';
import { AppButton, AppCard, AppTextField, ErrorText, Eyebrow, Screen } from '../../components/ui';
import { IMAGE_ACCEPT } from '../../constants';
import { getDateLocale, useT } from '../../i18n';

export function WeddingManagePage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const weddingQuery = useAdminWedding(id);
  const categoriesQuery = useAdminCategories(id);
  const participantsQuery = useAdminParticipants(id);
  const eventsQuery = useAdminTimelineEvents(id);
  const t = useT();
  const wedding = weddingQuery.data;
  const categories = categoriesQuery.data ?? [];
  const participants = participantsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const [error, setError] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [guestCount, setGuestCount] = useState(5);
  const [reviewerPrimary, setReviewerPrimary] = useState('');
  const [reviewerSecondary, setReviewerSecondary] = useState('');
  const [quickVote, setQuickVote] = useState(20);
  const [quickVoteEnabled, setQuickVoteEnabled] = useState(false);
  const [qrFor, setQrFor] = useState<{ id: string; url: string; blob: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [downloadingQr, setDownloadingQr] = useState(false);

  useEffect(() => {
    if (!wedding) return;
    setQuickVote(wedding.quickVotePhotoCount);
    setQuickVoteEnabled(wedding.quickVoteEnabled);
    setEventDate((current) => current || toDateInput(wedding.createdAt));
  }, [wedding]);

  const reload = async () => {
    if (!id) return;
    await invalidateAdminWedding(queryClient, id);
    if (wedding?.slug) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.guest.wedding(wedding.slug) });
    }
  };

  const run = async (action: () => Promise<unknown>) => {
    try {
      setError('');
      await action();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWrong'));
    }
  };

  const saveQuickVote = () =>
    run(() =>
      api(`/admin/weddings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quickVoteEnabled, quickVotePhotoCount: quickVote }),
      }),
    );

  const uploadCover = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    void run(async () => {
      const form = new FormData();
      form.append('file', file);
      await api(`/admin/weddings/${id}/cover`, { method: 'POST', body: form });
    });
  };

  const removeCover = () =>
    run(() => api(`/admin/weddings/${id}/cover`, { method: 'DELETE' }));

  const addCategory = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await api(`/admin/weddings/${id}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name: categoryName }),
      });
      setCategoryName('');
    });
  };

  const addTimelineEvent = (event: FormEvent) => {
    event.preventDefault();
    if (!eventTitle.trim() || !eventDate || !eventTime) return;
    const occursAt = new Date(`${eventDate}T${eventTime}`);
    if (Number.isNaN(occursAt.getTime())) {
      setError(t('admin.invalidTime'));
      return;
    }
    void run(async () => {
      await api(`/admin/weddings/${id}/timeline-events`, {
        method: 'POST',
        body: JSON.stringify({ title: eventTitle.trim(), occursAt: occursAt.toISOString() }),
      });
      setEventTitle('');
      setEventTime('');
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...categories];
    const swap = index + direction;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    void run(() =>
      api(`/admin/weddings/${id}/categories/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ categoryIds: next.map((c) => c.id) }),
      }),
    );
  };

  const addGuests = (count: number) => {
    const n = Number.isFinite(count) ? Math.min(50, Math.max(1, Math.round(count))) : 1;
    void run(async () => {
      await api(`/admin/weddings/${id}/participants`, {
        method: 'POST',
        body: JSON.stringify({ role: 'GUEST', count: n }),
      });
    });
  };

  const addPerson = (role: 'GUEST' | 'REVIEWER') => {
    if (role === 'GUEST') {
      addGuests(1);
      return;
    }
    void run(async () => {
      await api(`/admin/weddings/${id}/participants`, {
        method: 'POST',
        body: JSON.stringify({
          role,
          primaryName: reviewerPrimary,
          secondaryName: reviewerSecondary || null,
        }),
      });
      setReviewerPrimary('');
      setReviewerSecondary('');
    });
  };

  const openQr = async (participantId: string) => {
    const invite = await api<{ url: string }>(`/admin/participants/${participantId}/invitation`);
    const res = await fetch(`/api/admin/participants/${participantId}/invitation/qr`, {
      credentials: 'include',
    });
    const blob = URL.createObjectURL(await res.blob());
    setQrFor({ id: participantId, url: invite.url, blob });
  };

  const copyLink = async () => {
    if (!qrFor) return;
    await navigator.clipboard.writeText(qrFor.url);
  };

  const downloadAllQr = async () => {
    if (!id || !wedding) return;
    setDownloadingQr(true);
    setError('');
    try {
      await downloadFile(`/admin/weddings/${id}/invitations/qr.zip`, `${wedding.slug}-qr-codes.zip`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.downloadQrFailed'));
    } finally {
      setDownloadingQr(false);
    }
  };

  const loadError =
    weddingQuery.error instanceof ApiError
      ? weddingQuery.error.message
      : weddingQuery.error
        ? t('admin.loadWeddingFailed')
        : error;

  if (!wedding) {
    return (
      <Screen wide>
        <Typography color="text.secondary">{loadError || t('common.loading')}</Typography>
      </Screen>
    );
  }

  const guests = participants.filter((p) => p.role === 'GUEST');
  const reviewers = participants.filter((p) => p.role === 'REVIEWER');

  return (
    <Screen wide>
      <AppButton tone="ghost" component={RouterLink} to="/admin" sx={{ mb: 2 }}>
        {t('admin.backToWeddings')}
      </AppButton>
      <Eyebrow>{t(`status.${wedding.status}`)}</Eyebrow>
      <Typography variant="h1">{wedding.name}</Typography>
      <Typography color="text.secondary">/{wedding.slug}</Typography>
      <ErrorText>{error}</ErrorText>

      <AppCard sx={{ mt: 4 }}>
        <Typography variant="h2">{t('admin.coverTitle')}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          {t('admin.coverBody')}
        </Typography>
        {wedding.hasCoverPhoto && (
          <Box
            component="img"
            src={coverMediaUrl(wedding.id, 'thumb', wedding.updatedAt)}
            alt={wedding.name}
            sx={{
              mt: 2,
              width: 140,
              maxWidth: '40%',
              aspectRatio: '4 / 5',
              objectFit: 'cover',
              borderRadius: 3,
              display: 'block',
            }}
          />
        )}
        <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 2, flexWrap: 'wrap' }}>
          <AppButton tone={wedding.hasCoverPhoto ? 'ghost' : 'primary'} component="label">
            {wedding.hasCoverPhoto ? t('common.replace') : t('common.upload')}
            <input
              type="file"
              hidden
              accept={IMAGE_ACCEPT}
              onChange={(event) => {
                uploadCover(event.target.files);
                event.target.value = '';
              }}
            />
          </AppButton>
          {wedding.hasCoverPhoto && (
            <AppButton tone="ghost" onClick={() => void removeCover()}>
              {t('common.remove')}
            </AppButton>
          )}
        </Stack>
      </AppCard>

      <AppCard sx={{ mt: 2 }}>
        <Typography variant="h2">{t('admin.quickVoteTitle')}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          {t('admin.quickVoteBody')}
        </Typography>
        <FormControlLabel
          sx={{ mt: 1, ml: 0 }}
          control={
            <Switch
              checked={quickVoteEnabled}
              onChange={(event) => setQuickVoteEnabled(event.target.checked)}
            />
          }
          label={quickVoteEnabled ? t('admin.availableToGuests') : t('admin.notAvailable')}
        />
        <Stack direction="row" spacing={1.5} sx={{ mt: 2, alignItems: 'center' }}>
          <AppTextField
            fullWidth={false}
            type="number"
            label={t('admin.photosInSession')}
            disabled={!quickVoteEnabled}
            slotProps={{ htmlInput: { min: 1, max: 50 } }}
            value={quickVote}
            onChange={(e) => setQuickVote(Number(e.target.value))}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <AppButton onClick={() => void saveQuickVote()} sx={{ flexShrink: 0 }}>
            {t('common.save')}
          </AppButton>
        </Stack>
      </AppCard>

      <AppCard sx={{ mt: 2 }}>
        <Typography variant="h2">{t('admin.categoriesTitle')}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          {t('admin.categoriesBody')}
        </Typography>
        <Stack component="form" direction="row" spacing={1.5} sx={{ mt: 2, alignItems: 'center' }} onSubmit={addCategory}>
          <AppTextField
            fullWidth={false}
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder={t('admin.categoryPlaceholder')}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <AppButton type="submit" sx={{ flexShrink: 0 }}>
            {t('common.add')}
          </AppButton>
        </Stack>
        <Stack spacing={1} sx={{ mt: 2 }}>
          {categories.map((category, index) => (
            <Stack
              key={category.id}
              spacing={1}
              sx={{
                bgcolor: 'background.default',
                borderRadius: 3,
                px: 1.5,
                py: 1.5,
                minWidth: 0,
              }}
            >
              <Typography>{category.name}</Typography>
              <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <RowIconButton label={t('admin.moveUp')} disabled={index === 0} onClick={() => move(index, -1)}>
                  <KeyboardArrowUp />
                </RowIconButton>
                <RowIconButton
                  label={t('admin.moveDown')}
                  disabled={index === categories.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <KeyboardArrowDown />
                </RowIconButton>
                <RowIconButton
                  label={category.isActive ? t('admin.disableCategory') : t('admin.enableCategory')}
                  onClick={() =>
                    void run(() =>
                      api(`/admin/categories/${category.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isActive: !category.isActive }),
                      }),
                    )
                  }
                >
                  {category.isActive ? <VisibilityOff /> : <Visibility />}
                </RowIconButton>
                <AppButton
                  tone="danger"
                  onClick={() => setCategoryToDelete({ id: category.id, name: category.name })}
                  startIcon={<DeleteOutlined />}
                  sx={{ ml: 0.5 }}
                >
                  {t('admin.deleteCategory')}
                </AppButton>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </AppCard>

      <AppCard sx={{ mt: 2 }}>
        <Typography variant="h2">{t('admin.timelineTitle')}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          {t('admin.timelineBody')}
        </Typography>
        <Stack component="form" spacing={1.5} sx={{ mt: 2 }} onSubmit={addTimelineEvent}>
          <AppTextField
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder={t('admin.momentPlaceholder')}
            label={t('admin.moment')}
          />
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <AppTextField
              type="date"
              label={t('admin.date')}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ flex: 1, minWidth: 140 }}
            />
            <AppTextField
              type="time"
              label={t('admin.time')}
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ flex: 1, minWidth: 120 }}
            />
            <AppButton type="submit" sx={{ flexShrink: 0 }}>
              {t('common.add')}
            </AppButton>
          </Stack>
        </Stack>
        <Stack spacing={1} sx={{ mt: 2 }}>
          {events.map((moment) => (
            <Stack
              key={moment.id}
              direction="row"
              spacing={1}
              sx={{
                bgcolor: 'background.default',
                borderRadius: 3,
                px: 1.5,
                py: 1,
                alignItems: 'center',
                minWidth: 0,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0, pr: 0.5 }}>
                <Typography sx={{ fontWeight: 500 }}>{moment.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatEventTime(moment.occursAt)}
                </Typography>
              </Box>
              <RowIconButton
                label={t('admin.removeMoment')}
                onClick={() =>
                  void run(() => api(`/admin/timeline-events/${moment.id}`, { method: 'DELETE' }))
                }
              >
                <Close />
              </RowIconButton>
            </Stack>
          ))}
        </Stack>
      </AppCard>

      <AppCard sx={{ mt: 2 }}>
        <Typography variant="h2">{t('admin.guestsTitle')}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          {t('admin.guestsBody')}
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <AppButton fullWidth onClick={() => addGuests(1)}>
            {t('admin.addOneGuest')}
          </AppButton>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <AppTextField
              label={t('admin.howMany')}
              type="number"
              value={String(guestCount)}
              onChange={(e) => setGuestCount(Number(e.target.value))}
            />
            <AppButton
              fullWidth
              tone="ghost"
              onClick={() => addGuests(guestCount)}
              sx={{ width: { sm: 'auto' }, flexShrink: 0 }}
            >
              {t('admin.addManyGuests', { count: guestCount || 0 })}
            </AppButton>
          </Stack>
          <AppButton
            tone="gold"
            fullWidth
            startIcon={<FileDownloadOutlined />}
            onClick={() => void downloadAllQr()}
            disabled={downloadingQr || participants.length === 0}
          >
            {downloadingQr ? t('admin.preparingQrZip') : t('admin.downloadAllQr')}
          </AppButton>
        </Stack>
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {guests.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              onQr={(pid) => void openQr(pid)}
              onToggle={(next) =>
                void run(() =>
                  api(`/admin/participants/${next.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                      status: next.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                    }),
                  }),
                )
              }
              onRegenerate={(pid) =>
                void run(() =>
                  api(`/admin/participants/${pid}/invitation/regenerate`, { method: 'POST' }),
                )
              }
            />
          ))}
        </Stack>
      </AppCard>

      <PersonSection
        title={t('admin.reviewersTitle')}
        note={t('admin.reviewersBody')}
        addLabel={t('admin.addReviewer')}
        primary={reviewerPrimary}
        secondary={reviewerSecondary}
        onPrimary={setReviewerPrimary}
        onSecondary={setReviewerSecondary}
        onAdd={() => addPerson('REVIEWER')}
        people={reviewers}
        onQr={(pid) => void openQr(pid)}
        onToggle={(person) =>
          void run(() =>
            api(`/admin/participants/${person.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: person.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
            }),
          )
        }
        onRegenerate={(pid) =>
          void run(() => api(`/admin/participants/${pid}/invitation/regenerate`, { method: 'POST' }))
        }
      />

      <Dialog open={Boolean(categoryToDelete)} onClose={() => setCategoryToDelete(null)} fullWidth>
        <DialogTitle>{t('admin.deleteCategoryTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('admin.deleteCategoryBody', { name: categoryToDelete?.name ?? '' })}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <AppButton tone="ghost" onClick={() => setCategoryToDelete(null)}>
            {t('common.cancel')}
          </AppButton>
          <AppButton
            tone="danger"
            onClick={() => {
              if (!categoryToDelete) return;
              const idToDelete = categoryToDelete.id;
              setCategoryToDelete(null);
              void run(() => api(`/admin/categories/${idToDelete}`, { method: 'DELETE' }));
            }}
          >
            {t('admin.deleteCategoryConfirm')}
          </AppButton>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(qrFor)} onClose={() => setQrFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('admin.invitation')}</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {qrFor && (
            <>
              <Box component="img" src={qrFor.blob} alt={t('admin.qrAlt')} sx={{ width: 224, mt: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, wordBreak: 'break-all' }}>
                {qrFor.url}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <AppButton tone="ghost" onClick={() => void copyLink()}>
                  {t('common.copyLink')}
                </AppButton>
                <AppButton tone="gold" href={qrFor.blob} component="a" download="invitation-qr.png">
                  {t('common.download')}
                </AppButton>
                <AppButton tone="ghost" onClick={() => window.print()}>
                  {t('common.print')}
                </AppButton>
                <AppButton tone="ghost" onClick={() => setQrFor(null)}>
                  {t('common.close')}
                </AppButton>
              </Stack>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Screen>
  );
}

function RowIconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          size="small"
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            color: 'primary.main',
            width: 40,
            height: 40,
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function PersonSection({
  title,
  note,
  primary,
  secondary,
  onPrimary,
  onSecondary,
  addLabel,
  onAdd,
  people,
  onQr,
  onToggle,
  onRegenerate,
}: {
  title: string;
  note: string;
  primary: string;
  secondary: string;
  onPrimary: (value: string) => void;
  onSecondary: (value: string) => void;
  addLabel: string;
  onAdd: () => void;
  people: Participant[];
  onQr: (id: string) => void;
  onToggle: (person: Participant) => void;
  onRegenerate: (id: string) => void;
}) {
  const t = useT();
  return (
    <AppCard sx={{ mt: 2 }}>
      <Typography variant="h2">{title}</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
        {note}
      </Typography>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <AppTextField label={t('admin.primaryName')} value={primary} onChange={(e) => onPrimary(e.target.value)} />
        <AppTextField label={t('admin.secondName')} value={secondary} onChange={(e) => onSecondary(e.target.value)} />
        <AppButton fullWidth onClick={onAdd}>
          {addLabel}
        </AppButton>
      </Stack>
      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            onQr={onQr}
            onToggle={onToggle}
            onRegenerate={onRegenerate}
          />
        ))}
      </Stack>
    </AppCard>
  );
}

function PersonRow({
  person,
  onQr,
  onToggle,
  onRegenerate,
}: {
  person: Participant;
  onQr: (id: string) => void;
  onToggle: (person: Participant) => void;
  onRegenerate: (id: string) => void;
}) {
  const t = useT();
  return (
    <Box sx={{ bgcolor: 'background.default', borderRadius: 3, p: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography sx={{ fontWeight: 500 }}>{person.displayName}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Chip size="small" label={t(`status.${person.status}`)} />
            <Chip size="small" label={t(`invitationStatus.${person.invitationStatus}`)} variant="outlined" />
            {person.role === 'GUEST' && !person.claimed && (
              <Chip size="small" label={t('admin.waitingForName')} color="secondary" variant="outlined" />
            )}
          </Stack>
        </Box>
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          mt: 1.5,
          flexWrap: 'wrap',
          '& .MuiButton-root': {
            minHeight: { xs: 40, sm: 48 },
            px: { xs: 1.5, sm: 2.5 },
            fontSize: { xs: '0.85rem', sm: '0.95rem' },
          },
        }}
      >
        <AppButton tone="ghost" onClick={() => onQr(person.id)}>
          {t('admin.viewQr')}
        </AppButton>
        <AppButton tone="ghost" onClick={() => onRegenerate(person.id)}>
          {t('admin.regenerate')}
        </AppButton>
        <AppButton tone="ghost" onClick={() => onToggle(person)}>
          {person.status === 'ACTIVE' ? t('admin.deactivate') : t('admin.activate')}
        </AppButton>
      </Stack>
    </Box>
  );
}

function toDateInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString(getDateLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
