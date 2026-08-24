import { useCallback, useEffect, useRef, useState, type Ref } from 'react';
import Close from '@mui/icons-material/Close';
import Favorite from '@mui/icons-material/Favorite';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { api, mediaUrl } from '../api/client';
import type { Photo } from '../api/types';

const THRESHOLD = 110;
const MAX_VISIBLE = 3;

export function VoteDeck({
  photos,
  onDone,
}: {
  photos: Photo[];
  onDone: (voted: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<null | 'left' | 'right'>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const likeRef = useRef<HTMLDivElement | null>(null);
  const passRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ active: false, startX: 0, startY: 0, x: 0, y: 0 });
  const busy = useRef(false);
  const indexRef = useRef(0);
  indexRef.current = index;
  const photo = photos[index];

  const paint = useCallback((x: number, y: number, animate: boolean) => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = animate ? 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
    card.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${x / 16}deg)`;
    const strength = Math.min(1, Math.abs(x) / THRESHOLD);
    if (likeRef.current) likeRef.current.style.opacity = x > 12 ? String(strength) : '0';
    if (passRef.current) passRef.current.style.opacity = x < -12 ? String(strength) : '0';
  }, []);

  const finish = useCallback(
    (fromIndex: number) => {
      const next = fromIndex + 1;
      setLeaving(null);
      drag.current = { active: false, startX: 0, startY: 0, x: 0, y: 0 };
      busy.current = false;
      if (next >= photos.length) {
        onDone(photos.length);
      } else {
        setIndex(next);
      }
    },
    [onDone, photos.length],
  );

  const decide = useCallback(
    async (value: 0 | 1) => {
      const current = photos[indexRef.current];
      if (!current || busy.current) return;
      busy.current = true;
      const dir = value === 1 ? 'right' : 'left';
      setLeaving(dir);
      const fly = (value === 1 ? 1 : -1) * (window.innerWidth * 0.95);
      paint(fly, drag.current.y * 0.4, true);
      try {
        await api(`/photos/${current.id}/vote`, {
          method: 'POST',
          body: JSON.stringify({ value }),
        });
      } finally {
        window.setTimeout(() => finish(indexRef.current), 280);
      }
    },
    [finish, paint, photos],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') void decide(0);
      if (event.key === 'ArrowRight') void decide(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide]);

  if (!photo) return null;

  const visible = photos.slice(index, index + MAX_VISIBLE);

  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
      <Typography variant="overline" color="text.secondary">
        {index + 1} / {photos.length} · drag right for +1
      </Typography>

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 360,
          aspectRatio: '4 / 5',
          touchAction: 'none',
          userSelect: 'none',
          overflow: 'visible',
          mb: 2,
        }}
      >
        {[...visible].reverse().map((item, renderIndex, stack) => {
          const depth = stack.length - 1 - renderIndex;
          const isTop = depth === 0;
          return (
            <Box
              key={item.id}
              ref={isTop ? cardRef : undefined}
              onPointerDown={
                isTop
                  ? (event) => {
                      if (busy.current) return;
                      drag.current = {
                        active: true,
                        startX: event.clientX,
                        startY: event.clientY,
                        x: 0,
                        y: 0,
                      };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }
                  : undefined
              }
              onPointerMove={
                isTop
                  ? (event) => {
                      if (!drag.current.active) return;
                      const x = event.clientX - drag.current.startX;
                      const y = (event.clientY - drag.current.startY) * 0.35;
                      drag.current.x = x;
                      drag.current.y = y;
                      paint(x, y, false);
                    }
                  : undefined
              }
              onPointerUp={
                isTop
                  ? () => {
                      if (!drag.current.active) return;
                      drag.current.active = false;
                      if (drag.current.x > THRESHOLD) void decide(1);
                      else if (drag.current.x < -THRESHOLD) void decide(0);
                      else paint(0, 0, true);
                    }
                  : undefined
              }
              onPointerCancel={
                isTop
                  ? () => {
                      drag.current.active = false;
                      paint(0, 0, true);
                    }
                  : undefined
              }
              role={isTop ? 'img' : undefined}
              aria-label={isTop ? 'Photo to vote on. Drag right for a point, left to pass.' : undefined}
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: '28px',
                overflow: 'hidden',
                bgcolor: 'background.paper',
                boxShadow: '0 16px 40px rgba(43, 36, 24, 0.16)',
                transform: isTop
                  ? undefined
                  : `translateY(${depth * 10}px) scale(${1 - depth * 0.045})`,
                transformOrigin: 'center bottom',
                zIndex: 10 - depth,
                cursor: isTop ? 'grab' : 'default',
                pointerEvents: isTop && !leaving ? 'auto' : 'none',
              }}
            >
              <Box
                component="img"
                src={mediaUrl(item.id, 'medium')}
                alt=""
                draggable={false}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {isTop && (
                <>
                  <Stamp ref={likeRef} tone="like" label="Hell yeah" />
                  <Stamp ref={passRef} tone="pass" label="Hell nah" />
                </>
              )}
            </Box>
          );
        })}
      </Box>

      <Stack direction="row" spacing={3} sx={{ justifyContent: 'center', alignItems: 'center', pt: 0.5 }}>
        <IconButton
          aria-label="Pass, no point"
          onClick={() => void decide(0)}
          disabled={Boolean(leaving)}
          sx={{
            width: 56,
            height: 56,
            border: 2,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            color: 'text.secondary',
            '&:hover': { bgcolor: 'background.paper', borderColor: 'text.secondary' },
          }}
        >
          <Close />
        </IconButton>
        <IconButton
          aria-label="Give one point"
          onClick={() => void decide(1)}
          disabled={Boolean(leaving)}
          sx={{
            width: 64,
            height: 64,
            bgcolor: 'secondary.main',
            color: 'secondary.contrastText',
            boxShadow: '0 8px 24px rgba(196, 165, 116, 0.45)',
            '&:hover': { bgcolor: 'secondary.dark' },
          }}
        >
          <Favorite />
        </IconButton>
      </Stack>
    </Stack>
  );
}

function Stamp({
  ref,
  tone,
  label,
}: {
  ref?: Ref<HTMLDivElement>;
  tone: 'like' | 'pass';
  label: string;
}) {
  const like = tone === 'like';
  return (
    <Box
      ref={ref}
      aria-hidden
      sx={{
        position: 'absolute',
        top: 22,
        left: like ? 18 : 'auto',
        right: like ? 'auto' : 18,
        px: 1.5,
        py: 0.5,
        border: 3,
        borderRadius: 1.5,
        borderColor: like ? 'secondary.main' : 'error.main',
        color: like ? 'secondary.main' : 'error.main',
        typography: 'h2',
        fontSize: '1.45rem',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        opacity: 0,
        transform: like ? 'rotate(-12deg)' : 'rotate(12deg)',
        bgcolor: 'rgba(251, 246, 238, 0.88)',
        pointerEvents: 'none',
      }}
    >
      {label}
    </Box>
  );
}
