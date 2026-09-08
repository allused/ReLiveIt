import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { mediaUrl } from '../../api/client';
import { useRankings } from '../../api/hooks';
import type { RankingItem } from '../../api/types';
import { AppButton, ErrorText, Eyebrow, Screen } from '../../components/ui';
import { useT } from '../../i18n';

export function RankingsPage() {
  const { weddingId } = useParams();
  const { data, error } = useRankings(weddingId);
  const t = useT();
  const overall = data?.overall ?? [];
  const categories = data?.categories ?? [];

  return (
    <Screen padded={false}>
      <Box sx={{ px: 2.5 }}>
        <AppButton tone="ghost" component={RouterLink} to={`/reviewer/${weddingId}`} sx={{ mb: 1 }}>
          {t('common.dashboard')}
        </AppButton>
        <Typography variant="h1">{t('reviewer.rankings.title')}</Typography>
        <ErrorText>{error?.message ?? ''}</ErrorText>
      </Box>
      <Stack spacing={5} sx={{ mt: 3, minWidth: 0 }}>
        {overall.length > 0 && (
          <Box component="section">
            <Box sx={{ px: 2.5 }}>
              <Typography variant="h2">{t('reviewer.rankings.top5')}</Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                {t('reviewer.rankings.top5Body')}
              </Typography>
            </Box>
            <RankingCarousel items={overall} showCategory ariaLabel={t('reviewer.rankings.top5Aria')} />
          </Box>
        )}
        {categories.map((row) => {
          const top5 = row.top.slice(0, 5);
          const top10 = row.top.slice(0, 10);
          if (top10.length === 0) return null;
          return (
            <Box key={row.category.id} component="section">
              <Typography variant="h2" sx={{ px: 2.5 }}>
                {row.category.name}
              </Typography>
              {top5.length > 0 && (
                <RankingCarousel items={top5} ariaLabel={t('reviewer.rankings.topAria', { name: row.category.name, n: 5 })} />
              )}
              <Typography variant="h3" sx={{ px: 2.5, mt: 3 }}>
                {t('reviewer.rankings.top10')}
              </Typography>
              <RankingCarousel items={top10} ariaLabel={t('reviewer.rankings.topAria', { name: row.category.name, n: 10 })} />
            </Box>
          );
        })}
      </Stack>
    </Screen>
  );
}

function RankingCarousel({
  items,
  showCategory = false,
  ariaLabel,
}: {
  items: RankingItem[];
  showCategory?: boolean;
  ariaLabel: string;
}) {
  return (
    <Box
      role="region"
      aria-label={ariaLabel}
      sx={{
        mt: 2,
        py: 0.75,
        display: 'flex',
        gap: 2,
        width: '100%',
        minWidth: 0,
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorX: 'contain',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {items.map((item, index) => (
        <Box
          key={item.id}
          sx={{
            flex: '0 0 70%',
            minWidth: 0,
            scrollSnapAlign: 'center',
            ...(index === 0 && { ml: '15%' }),
            ...(index === items.length - 1 && { mr: '15%' }),
            px: 1,
          }}
        >
          <RankingCard item={item} showCategory={showCategory} compact />
        </Box>
      ))}
    </Box>
  );
}

function RankingCard({
  item,
  showCategory = false,
  compact = false,
}: {
  item: RankingItem;
  showCategory?: boolean;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <Card sx={{ overflow: 'hidden', height: '100%' }}>
      {item.photo && (
        <Box
          component="img"
          src={mediaUrl(item.photo.id, compact ? 'thumb' : 'medium')}
          alt=""
          sx={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', display: 'block' }}
        />
      )}
      <CardContent sx={compact ? { p: 1.25, '&:last-child': { pb: 1.25 } } : undefined}>
        <Eyebrow>#{item.rank}</Eyebrow>
        {showCategory && item.category && (
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.25 }}>
            {item.category.name}
          </Typography>
        )}
        <Typography variant={compact ? 'h3' : 'h2'}>
          {t('reviewer.rankings.points', { count: item.totalPoints })}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {t('reviewer.rankings.votes', {
            count: item.voteCount,
            percent: Math.round(item.approvalRate * 100),
          })}
        </Typography>
      </CardContent>
    </Card>
  );
}
