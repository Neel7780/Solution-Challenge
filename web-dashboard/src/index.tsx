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
    mode: 'light',
    primary: {
      main: '#0079c1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#005a90',
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
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#1c1e21',
      secondary: '#5f6368',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
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
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
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
            boxShadow: '0 4px 12px rgba(0, 121, 193, 0.2)',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRight: '1px solid rgba(0, 0, 0, 0.08)',
          width: 240, // Slimmer drawer
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#1c1e21',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '10px 16px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
        },
        head: {
          color: '#5f6368',
          fontSize: '0.7rem',
          fontWeight: 600,
          backgroundColor: '#f8f9fa',
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
