import { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorText, Eyebrow, Screen } from '../components/ui';

export function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        setError('This invitation link is invalid.');
        return;
      }
      try {
        const result = await api<{ redirectTo: string }>(`/invite/${token}`);
        await refresh();
        if (!cancelled) {
          navigate(result.redirectTo, { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'This invitation link is invalid, expired, or has been replaced.',
          );
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate, refresh, token]);

  return (
    <Screen>
      <Eyebrow>ReLiveIt</Eyebrow>
      <Typography variant="h1" sx={{ mt: 1 }}>
        Opening your invitation
      </Typography>
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
