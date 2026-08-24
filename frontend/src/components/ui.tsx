import type { ElementType, ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ButtonProps } from '@mui/material/Button';
import type { TextFieldProps } from '@mui/material/TextField';

export function Screen({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Container
      maxWidth={false}
      sx={{
        maxWidth: wide ? 720 : 480,
        py: 3,
        px: 2.5,
        pb: 12,
        minHeight: '100dvh',
      }}
    >
      {children}
    </Container>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Typography variant="overline" color="secondary">
      {children}
    </Typography>
  );
}

type AppButtonProps = ButtonProps & {
  tone?: 'primary' | 'ghost' | 'danger' | 'gold';
  to?: string;
  download?: string;
  component?: ElementType;
};

export function AppButton({ tone = 'primary', ...props }: AppButtonProps) {
  const mapped: Pick<ButtonProps, 'variant' | 'color'> =
    tone === 'ghost'
      ? { variant: 'outlined', color: 'primary' }
      : tone === 'danger'
        ? { variant: 'contained', color: 'error' }
        : tone === 'gold'
          ? { variant: 'contained', color: 'secondary' }
          : { variant: 'contained', color: 'primary' };
  return <Button {...mapped} {...(props as ButtonProps)} />;
}

export function AppCard({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <Card sx={sx}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>{children}</CardContent>
    </Card>
  );
}

export function AppTextField(props: TextFieldProps) {
  return <TextField fullWidth size="medium" {...props} />;
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <Alert severity="error" sx={{ mt: 2 }}>
      {children}
    </Alert>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Box
      sx={{
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 4,
        px: 3,
        py: 6,
        textAlign: 'center',
      }}
    >
      <Typography variant="h2">{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {body}
      </Typography>
    </Box>
  );
}
