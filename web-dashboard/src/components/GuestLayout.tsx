import React, { useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Paper,
  Avatar,
} from '@mui/material';
import {
  Home as HomeIcon,
  Warning as WarningIcon,
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { useNotificationStore } from '../store/notificationStore';

export default function GuestLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { connected } = useSocketStore();
  const { unreadCount } = useNotificationStore();
  const navRef = useRef(null);

  useGSAP(() => {
    gsap.from(navRef.current, {
      y: 100,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
    });
  });

  const getPathValue = (path: string) => {
    if (path.includes('emergency')) return 1;
    if (path.includes('notifications')) return 2;
    if (path.includes('check-in')) return 3;
    return 0; // dashboard
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ pb: 7, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{
          background: 'var(--bg-glass)',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <Toolbar>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box 
              className={`status-dot ${connected ? 'status-dot--live' : 'status-dot--alert'}`} 
            />
            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
              {user?.room_number ? `Room ${user.room_number}` : 'Guest Portal'}
            </Typography>
          </Box>
          <IconButton onClick={handleLogout} color="inherit" size="small">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ p: 2, flexGrow: 1, pb: 10 }}>
        <Outlet />
      </Box>

      <Paper 
        ref={navRef}
        sx={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          zIndex: 1000,
          background: 'var(--bg-glass)',
          borderTop: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(20px)',
          borderRadius: 0,
        }} 
        elevation={0}
      >
        <BottomNavigation
          showLabels
          value={getPathValue(location.pathname)}
          onChange={(event, newValue) => {
            switch(newValue) {
              case 0: navigate('/guest'); break;
              case 1: navigate('/guest/emergency'); break;
              case 2: navigate('/guest/notifications'); break;
              case 3: navigate('/guest/check-in'); break;
            }
          }}
          sx={{ background: 'transparent' }}
        >
          <BottomNavigationAction label="Home" icon={<HomeIcon />} />
          <BottomNavigationAction 
            label="Emergency" 
            icon={<WarningIcon color="error" />} 
          />
          <BottomNavigationAction 
            label="Alerts" 
            icon={
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            } 
          />
          <BottomNavigationAction label="Check-In" icon={<CheckCircleIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
