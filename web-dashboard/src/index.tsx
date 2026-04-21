import React, { useEffect } from 'react';
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

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#f6d365',
    },
    secondary: {
      main: '#4de6c6',
    },
    error: {
      main: '#ff5c5c',
    },
    background: {
      default: '#0a0d12',
      paper: 'rgba(16, 20, 28, 0.76)',
    },
    text: {
      primary: '#f5f7fa',
      secondary: 'rgba(245, 247, 250, 0.72)',
    },
    divider: 'rgba(246, 211, 101, 0.12)',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    h1: { fontFamily: "'Fraunces', serif", fontWeight: 300, letterSpacing: '-0.02em' },
    h2: { fontFamily: "'Fraunces', serif", fontWeight: 300, letterSpacing: '-0.02em' },
    h3: { fontFamily: "'Fraunces', serif", fontWeight: 300, letterSpacing: '-0.01em' },
    h4: { fontFamily: "'Fraunces', serif", fontWeight: 400, letterSpacing: '-0.01em' },
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
          backgroundColor: 'rgba(16, 20, 28, 0.76)',
          border: '1px solid rgba(246, 211, 101, 0.12)',
          backdropFilter: 'blur(14px)',
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
          color: '#121417',
          '&:hover': {
            boxShadow: '0 0 24px rgba(246, 211, 101, 0.18)',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(10, 13, 18, 0.95)',
          borderRight: '1px solid rgba(246, 211, 101, 0.12)',
          width: 240, // Slimmer drawer
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10, 13, 18, 0.75)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(246, 211, 101, 0.12)',
          boxShadow: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
        },
        head: {
          color: '#64748b',
          fontSize: '0.7rem',
          fontWeight: 600,
        },
      },
    },
  },
});

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
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AppWrapper />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
