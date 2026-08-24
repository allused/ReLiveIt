import { useEffect, useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { Category, Participant, WeddingSummary } from '../../api/types';
import { AppButton, AppCard, AppTextField, ErrorText, Eyebrow, Screen } from '../../components/ui';

export function WeddingManagePage() {
  const { id } = useParams();
  const [wedding, setWedding] = useState<WeddingSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [guestPrimary, setGuestPrimary] = useState('');
  const [guestSecondary, setGuestSecondary] = useState('');
  const [reviewerPrimary, setReviewerPrimary] = useState('');
  const [reviewerSecondary, setReviewerSecondary] = useState('');
  const [quickVote, setQuickVote] = useState(20);
  const [quickVoteEnabled, setQuickVoteEnabled] = useState(false);
  const [qrFor, setQrFor] = useState<{ id: string; url: string; blob: string } | null>(null);

  const load = async () => {
    if (!id) return;
    const [w, cats, people] = await Promise.all([
      api<WeddingSummary>(`/admin/weddings/${id}`),
      api<Category[]>(`/admin/weddings/${id}/categories`),
      api<Participant[]>(`/admin/weddings/${id}/participants`),
    ]);
    setWedding(w);
    setQuickVote(w.quickVotePhotoCount);
    setQuickVoteEnabled(w.quickVoteEnabled);
    setCategories(cats);
    setParticipants(people);
  };

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not load wedding.');
    });
  }, [id]);

  const saveQuickVote = async () => {
    if (!id) return;
    await api(`/admin/weddings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quickVoteEnabled, quickVotePhotoCount: quickVote }),
    });
    await load();
  };

  const addCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;
    await api(`/admin/weddings/${id}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name: categoryName }),
    });
    setCategoryName('');
    await load();
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!id) return;
    const next = [...categories];
    const swap = index + direction;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    await api(`/admin/weddings/${id}/categories/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ categoryIds: next.map((c) => c.id) }),
    });
    await load();
  };

  const addPerson = async (role: 'GUEST' | 'REVIEWER') => {
    if (!id) return;
    const primaryName = role === 'GUEST' ? guestPrimary : reviewerPrimary;
    const secondaryName = role === 'GUEST' ? guestSecondary : reviewerSecondary;
    await api(`/admin/weddings/${id}/participants`, {
      method: 'POST',
      body: JSON.stringify({
        role,
        primaryName,
        secondaryName: secondaryName || null,
      }),
    });
    if (role === 'GUEST') {
      setGuestPrimary('');
      setGuestSecondary('');
    } else {
      setReviewerPrimary('');
      setReviewerSecondary('');
    }
    await load();
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

  if (!wedding) {
    return (
      <Screen wide>
        <Typography color="text.secondary">{error || 'Loading…'}</Typography>
      </Screen>
    );
  }

  const guests = participants.filter((p) => p.role === 'GUEST');
  const reviewers = participants.filter((p) => p.role === 'REVIEWER');

  return (
    <Screen wide>
      <AppButton tone="ghost" component={RouterLink} to="/admin" sx={{ mb: 2 }}>
        Back to weddings
      </AppButton>
      <Eyebrow>{wedding.status}</Eyebrow>
      <Typography variant="h1">{wedding.name}</Typography>
      <Typography color="text.secondary">/{wedding.slug}</Typography>
      <ErrorText>{error}</ErrorText>

      <AppCard sx={{ mt: 4 }}>
        <Typography variant="h2">Quick Vote</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          Optional. When this is off, guests will not see Quick Vote on this wedding.
        </Typography>
        <FormControlLabel
          sx={{ mt: 1, ml: 0 }}
          control={
            <Switch
              checked={quickVoteEnabled}
              onChange={(event) => setQuickVoteEnabled(event.target.checked)}
            />
          }
          label={quickVoteEnabled ? 'Available to guests' : 'Not available'}
        />
        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
          <AppTextField
            type="number"
            label="Photos in a session"
            disabled={!quickVoteEnabled}
            slotProps={{ htmlInput: { min: 1, max: 50 } }}
            value={quickVote}
            onChange={(e) => setQuickVote(Number(e.target.value))}
          />
          <AppButton onClick={() => void saveQuickVote()}>Save</AppButton>
        </Stack>
      </AppCard>

      <AppCard sx={{ mt: 2 }}>
        <Typography variant="h2">Categories</Typography>
        <Stack component="form" direction="row" spacing={1.5} sx={{ mt: 2 }} onSubmit={(event) => void addCategory(event)}>
          <AppTextField
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Ceremony"
          />
          <AppButton type="submit">Add</AppButton>
        </Stack>
        <Stack spacing={1} sx={{ mt: 2 }}>
          {categories.map((category, index) => (
            <Stack
              key={category.id}
              direction="row"
              sx={{
                bgcolor: 'background.default',
                borderRadius: 3,
                px: 2,
                py: 1.5,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography>{category.name}</Typography>
              <Stack direction="row" spacing={1}>
                <AppButton tone="ghost" onClick={() => void move(index, -1)}>
                  Up
                </AppButton>
                <AppButton tone="ghost" onClick={() => void move(index, 1)}>
                  Down
                </AppButton>
                <AppButton
                  tone="ghost"
                  onClick={() =>
                    void api(`/admin/categories/${category.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ isActive: !category.isActive }),
                    }).then(load)
                  }
                >
                  {category.isActive ? 'Disable' : 'Enable'}
                </AppButton>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </AppCard>

      <PersonSection
        title="Guests"
        note="A second name creates a shared pair account. Both people use the same QR, uploads, and votes."
        primary={guestPrimary}
        secondary={guestSecondary}
        onPrimary={setGuestPrimary}
        onSecondary={setGuestSecondary}
        onAdd={() => void addPerson('GUEST')}
        people={guests}
        onQr={(pid) => void openQr(pid)}
        onToggle={(person) =>
          void api(`/admin/participants/${person.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: person.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
          }).then(load)
        }
        onRegenerate={(pid) =>
          void api(`/admin/participants/${pid}/invitation/regenerate`, { method: 'POST' }).then(load)
        }
      />

      <PersonSection
        title="Reviewers"
        note="Only reviewer accounts can conclude the wedding and see final rankings."
        primary={reviewerPrimary}
        secondary={reviewerSecondary}
        onPrimary={setReviewerPrimary}
        onSecondary={setReviewerSecondary}
        onAdd={() => void addPerson('REVIEWER')}
        people={reviewers}
        onQr={(pid) => void openQr(pid)}
        onToggle={(person) =>
          void api(`/admin/participants/${person.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: person.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
          }).then(load)
        }
        onRegenerate={(pid) =>
          void api(`/admin/participants/${pid}/invitation/regenerate`, { method: 'POST' }).then(load)
        }
      />

      <Dialog open={Boolean(qrFor)} onClose={() => setQrFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>Invitation</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {qrFor && (
            <>
              <Box component="img" src={qrFor.blob} alt="Invitation QR code" sx={{ width: 224, mt: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, wordBreak: 'break-all' }}>
                {qrFor.url}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <AppButton tone="ghost" onClick={() => void copyLink()}>
                  Copy link
                </AppButton>
                <AppButton tone="gold" href={qrFor.blob} component="a" download="invitation-qr.png">
                  Download
                </AppButton>
                <AppButton tone="ghost" onClick={() => window.print()}>
                  Print
                </AppButton>
                <AppButton tone="ghost" onClick={() => setQrFor(null)}>
                  Close
                </AppButton>
              </Stack>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Screen>
  );
}

function PersonSection({
  title,
  note,
  primary,
  secondary,
  onPrimary,
  onSecondary,
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
  onAdd: () => void;
  people: Participant[];
  onQr: (id: string) => void;
  onToggle: (person: Participant) => void;
  onRegenerate: (id: string) => void;
}) {
  return (
    <AppCard sx={{ mt: 2 }}>
      <Typography variant="h2">{title}</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
        {note}
      </Typography>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <AppTextField label="Primary name" value={primary} onChange={(e) => onPrimary(e.target.value)} />
        <AppTextField label="Second name (optional)" value={secondary} onChange={(e) => onSecondary(e.target.value)} />
        <AppButton fullWidth onClick={onAdd}>
          Add {title.slice(0, -1).toLowerCase()}
        </AppButton>
      </Stack>
      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {people.map((person) => (
          <Box key={person.id} sx={{ bgcolor: 'background.default', borderRadius: 3, p: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography sx={{ fontWeight: 500 }}>{person.displayName}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Chip size="small" label={person.status} />
                  <Chip size="small" label={`invite ${person.invitationStatus}`} variant="outlined" />
                </Stack>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.5, flexWrap: 'wrap' }}>
              <AppButton tone="ghost" onClick={() => onQr(person.id)}>
                View QR
              </AppButton>
              <AppButton tone="ghost" onClick={() => onRegenerate(person.id)}>
                Regenerate
              </AppButton>
              <AppButton tone="ghost" onClick={() => onToggle(person)}>
                {person.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </AppButton>
            </Stack>
          </Box>
        ))}
      </Stack>
    </AppCard>
  );
}
