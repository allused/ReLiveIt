import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { api, mediaUrl } from '../../api/client';
import type { RankingRow } from '../../api/types';
import { AppButton, ErrorText, Eyebrow, Screen } from '../../components/ui';

export function RankingsPage() {
  const { weddingId } = useParams();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!weddingId) return;
    void api<RankingRow[]>(`/reviewer/weddings/${weddingId}/rankings`)
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, [weddingId]);

  return (
    <Screen>
      <AppButton tone="ghost" component={RouterLink} to={`/reviewer/${weddingId}`} sx={{ mb: 1 }}>
        Dashboard
      </AppButton>
      <Typography variant="h1">Top photos</Typography>
      <ErrorText>{error}</ErrorText>
      <Stack spacing={5} sx={{ mt: 3 }}>
        {rows.map((row) => (
          <Box key={row.category.id} component="section">
            <Typography variant="h2">{row.category.name}</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {row.top.map((item) => (
                <Card key={item.id} sx={{ overflow: 'hidden' }}>
                  {item.photo && (
                    <Box
                      component="img"
                      src={mediaUrl(item.photo.id, 'medium')}
                      alt=""
                      sx={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                  <CardContent>
                    <Eyebrow>#{item.rank}</Eyebrow>
                    <Typography variant="h2">{item.totalPoints} points</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {item.voteCount} votes · {Math.round(item.approvalRate * 100)}% yes
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Screen>
  );
}
