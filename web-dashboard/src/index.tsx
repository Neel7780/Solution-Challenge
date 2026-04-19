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
      main: '#ff3e3e', // Electric Red
    },
    secondary: {
      main: '#00f58c', // Neon Green
    },
    background: {
      default: '#030303',
      paper: 'rgba(10, 10, 10, 0.7)',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
    divider: 'rgba(255, 255, 255, 0.04)',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    h1: { fontFamily: "'Outfit', sans-serif", fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontFamily: "'Outfit', sans-serif", fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontFamily: "'Outfit', sans-serif", fontWeight: 500 },
    h4: { fontFamily: "'Outfit', sans-serif", fontWeight: 500 },
    body1: { fontWeight: 300, fontSize: '0.875rem' },
    body2: { fontWeight: 300, fontSize: '0.8125rem' },
    button: {
      fontWeight: 500,
      textTransform: 'none' as const,
      fontSize: '0.8125rem',
    },
  },
  shape: {
    borderRadius: 6, // Sharper, more formal corners
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
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: '6px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 0 15px rgba(255, 62, 62, 0.2)',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#050505',
          borderRight: '1px solid rgba(255, 255, 255, 0.04)',
          width: 240, // Slimmer drawer
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(3, 3, 3, 0.7)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
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
