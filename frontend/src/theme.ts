import { createTheme } from '@mui/material/styles';

const cream = '#F6EFE4';
const paper = '#FBF6EE';
const ink = '#2B2418';
const muted = '#7A6E5D';
const gold = '#C4A574';
const blush = '#E8C4B8';
export const rose = '#C99486';

export const theme = createTheme({
  palette: {
    background: { default: cream, paper },
    primary: { main: ink, contrastText: cream },
    secondary: { main: gold, contrastText: ink },
    error: { main: '#A45D55', contrastText: cream },
    text: { primary: ink, secondary: muted },
    divider: 'rgba(43, 36, 24, 0.12)',
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Outfit", "Segoe UI", sans-serif',
    h1: { fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500, fontSize: '2.4rem', lineHeight: 1.15 },
    h2: { fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500, fontSize: '1.7rem', lineHeight: 1.2 },
    h3: { fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500, fontSize: '1.35rem' },
    overline: { letterSpacing: '0.28em', color: gold, fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 500, fontSize: '0.95rem' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 48, borderRadius: 999, paddingInline: 20 },
        contained: {
          '&.MuiButton-colorError': {
            backgroundColor: blush,
            color: ink,
            '&:hover': { backgroundColor: '#dcb3a8' },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 10px 40px rgba(43, 36, 24, 0.08)',
          backgroundImage: 'none',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: '#fff',
          minHeight: 48,
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(246, 239, 228, 0.96)', backdropFilter: 'blur(10px)' },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: cream, color: ink },
        '@media print': {
          nav: { display: 'none !important' },
          button: { display: 'none !important' },
        },
      },
    },
  },
});
