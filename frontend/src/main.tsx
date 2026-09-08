import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { queryClient } from './api/queryClient';
import { AuthProvider } from './auth/AuthContext';
import { I18nProvider } from './i18n';
import App from './App';
import { theme } from './theme';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <I18nProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
