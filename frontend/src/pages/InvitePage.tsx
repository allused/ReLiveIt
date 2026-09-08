import { useEffect } from 'react';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useInvite } from '../api/hooks';
import { queryKeys } from '../api/keys';
import { ErrorText, Eyebrow, Screen } from '../components/ui';
import { useT } from '../i18n';

export function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invite = useInvite(token);
  const t = useT();

  useEffect(() => {
    if (!invite.data) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() }).then(() => {
      navigate(invite.data.redirectTo, { replace: true });
    });
  }, [invite.data, navigate, queryClient]);

  const error =
    !token
      ? t('invite.invalid')
      : invite.error
        ? invite.error instanceof ApiError
          ? invite.error.message
          : t('invite.invalidOrExpired')
        : '';

  return (
    <Screen>
      <Eyebrow>ReLiveIt</Eyebrow>
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('invite.opening')}
      </Typography>
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
