import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { LOCALES, useLocale, type Locale } from '../i18n';

export function LanguageSwitch({ light = false }: { light?: boolean }) {
  const { locale, setLocale } = useLocale();
  const idle = light ? 'rgba(246, 239, 228, 0.72)' : 'text.secondary';
  const active = light ? '#F6EFE4' : 'primary.main';

  return (
    <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
      {LOCALES.map((code) => (
        <Button
          key={code}
          size="small"
          onClick={() => setLocale(code as Locale)}
          aria-pressed={locale === code}
          sx={{
            minWidth: 36,
            minHeight: 32,
            px: 1,
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            color: locale === code ? active : idle,
            fontWeight: locale === code ? 600 : 400,
          }}
        >
          {code.toUpperCase()}
        </Button>
      ))}
    </Stack>
  );
}
