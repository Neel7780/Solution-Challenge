import React, { useRef, useState } from 'react';
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
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import {
  Home as HomeIcon,
  Warning as WarningIcon,
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Chat as ChatIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { useNotificationStore } from '../store/notificationStore';
import { useThemeStore } from '../store/themeStore';

export default function GuestLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { connected } = useSocketStore();
  const { unreadCount } = useNotificationStore();
  const { mode, toggleTheme } = useThemeStore();
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
    if (path.includes('chat')) return 2;
    if (path.includes('notifications')) return 3;
    return 0; // dashboard
  };

  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  // Dynamically fetch safety status on drawer open / render
  const safetyStatus = user?.id 
    ? (localStorage.getItem(`guest_safety_status_${user.id}`) || 'unchecked')
    : 'unchecked';

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
        <Toolbar sx={{ display: 'flex', gap: 1 }}>
          <IconButton 
            edge="start" 
            color="inherit" 
            aria-label="menu" 
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box 
              className={`status-dot ${connected ? 'status-dot--live' : 'status-dot--alert'}`} 
            />
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
              {user?.room_number ? `Room ${user.room_number}` : 'Guest Portal'}
            </Typography>
          </Box>
          <IconButton onClick={toggleTheme} color="inherit" size="small" sx={{ mr: 1 }}>
            {mode === 'light' ? <DarkModeIcon sx={{ fontSize: '1.2rem' }} /> : <LightModeIcon sx={{ fontSize: '1.2rem' }} />}
          </IconButton>
          <IconButton onClick={handleLogout} color="inherit" size="small">
            <LogoutIcon sx={{ fontSize: '1.2rem' }} />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 250,
              background: 'var(--bg-card)',
              borderRight: '1px solid var(--border-medium)',
              backdropFilter: 'blur(10px)',
              p: 2,
            }
          }
        }}
      >
        <Box sx={{ mb: 3, mt: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'var(--accent-blue)', color: '#fff', width: 36, height: 36 }}>
            {user?.name?.charAt(0) || 'G'}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name || 'Guest User'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 170 }}>
              {user?.email}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {safetyStatus === 'safe' && (
                <Chip label="SAFE" size="small" color="success" sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }} />
              )}
              {safetyStatus === 'needs_help' && (
                <Chip label="NEEDS HELP" size="small" color="error" sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }} />
              )}
              {safetyStatus === 'unchecked' && (
                <Chip label="UNCHECKED" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18, borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }} />
              )}
            </Box>
          </Box>
        </Box>
        <Divider sx={{ mb: 2, borderColor: 'var(--border-subtle)' }} />
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigation('/guest')} sx={{ borderRadius: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}><HomeIcon sx={{ fontSize: 20 }} /></ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: '0.85rem' }}>Home Dashboard</Typography>} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigation('/guest/emergency')} sx={{ borderRadius: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}><WarningIcon color="error" sx={{ fontSize: 20 }} /></ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: '0.85rem' }}>SOS Emergency Trigger</Typography>} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigation('/guest/chat')} sx={{ borderRadius: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}><ChatIcon sx={{ fontSize: 20 }} /></ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: '0.85rem' }}>Property Chat</Typography>} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigation('/guest/notifications')} sx={{ borderRadius: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Badge badgeContent={unreadCount} color="error" variant="dot">
                  <NotificationsIcon sx={{ fontSize: 20 }} />
                </Badge>
              </ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: '0.85rem' }}>Safety Alerts</Typography>} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigation('/guest/check-in')} sx={{ borderRadius: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}><CheckCircleIcon sx={{ fontSize: 20 }} /></ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontSize: '0.85rem' }}>Triage Check-In</Typography>} />
            </ListItemButton>
          </ListItem>
        </List>
        <Box sx={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <Divider sx={{ mb: 2, borderColor: 'var(--border-subtle)' }} />
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 1, color: 'var(--accent-red)' }}>
            <ListItemIcon sx={{ minWidth: 36, color: 'var(--accent-red)' }}><LogoutIcon sx={{ fontSize: 20 }} /></ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Sign Out</Typography>} />
          </ListItemButton>
        </Box>
      </Drawer>

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
              case 2: navigate('/guest/chat'); break;
              case 3: navigate('/guest/notifications'); break;
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
            label="Chat" 
            icon={<ChatIcon />} 
          />
          <BottomNavigationAction 
            label="Alerts" 
            icon={
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            } 
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
