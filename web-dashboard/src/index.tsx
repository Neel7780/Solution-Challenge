import React, { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import App from './App';
import { useAuthStore } from './store/authStore';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

import { useThemeStore } from './store/themeStore';

const getTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    primary: {
      main: '#0079c1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: mode === 'light' ? '#005a90' : '#009bf7',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    success: {
      main: '#2e7d32',
    },
    background: {
      default: mode === 'light' ? '#f8f9fa' : '#0a0c10',
      paper: mode === 'light' ? '#ffffff' : '#161b22',
    },
    text: {
      primary: mode === 'light' ? '#1c1e21' : '#f0f6fc',
      secondary: mode === 'light' ? '#5f6368' : '#8b949e',
    },
    divider: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    h1: { fontFamily: "'Inter', sans-serif", fontWeight: 500, letterSpacing: '-0.02em' },
    h2: { fontFamily: "'Inter', sans-serif", fontWeight: 500, letterSpacing: '-0.02em' },
    h3: { fontFamily: "'Inter', sans-serif", fontWeight: 500, letterSpacing: '-0.01em' },
    h4: { fontFamily: "'Inter', sans-serif", fontWeight: 500, letterSpacing: '-0.01em' },
    overline: { fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.14em' },
    body1: { fontWeight: 400, fontSize: '0.9rem' },
    body2: { fontWeight: 400, fontSize: '0.82rem' },
    button: {
      fontWeight: 600,
      textTransform: 'none' as const,
      fontSize: '0.8125rem',
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: mode === 'light' ? '#ffffff' : '#161b22',
          border: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: mode === 'light' ? '0 4px 20px -2px rgba(0, 0, 0, 0.05)' : '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '6px 16px',
        },
        contained: {
          boxShadow: 'none',
          color: '#ffffff',
          '&:hover': {
            boxShadow: mode === 'light' ? '0 4px 12px rgba(0, 121, 193, 0.2)' : '0 4px 12px rgba(0, 121, 193, 0.4)',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: mode === 'light' ? '#ffffff' : '#0d1117',
          borderRight: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
          width: 240, // Slimmer drawer
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'light' ? '#ffffff' : '#0d1117',
          color: mode === 'light' ? '#1c1e21' : '#f0f6fc',
          borderBottom: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '10px 16px',
          borderBottom: mode === 'light' ? '1px solid rgba(0, 0, 0, 0.04)' : '1px solid rgba(255, 255, 255, 0.04)',
        },
        head: {
          color: mode === 'light' ? '#5f6368' : '#8b949e',
          fontSize: '0.7rem',
          fontWeight: 600,
          backgroundColor: mode === 'light' ? '#f8f9fa' : '#161b22',
        },
      },
    },
  },
});

function ThemeContainer({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);

  const theme = useMemo(() => {
    return getTheme(mode);
  }, [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

function AppWrapper() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return <App />;
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeContainer>
        <BrowserRouter>
          <AppWrapper />
        </BrowserRouter>
      </ThemeContainer>
    </QueryClientProvider>
  </React.StrictMode>
);
