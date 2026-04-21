import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Warning as WarningIcon,
  Healing as HealingIcon,
  People as PeopleIcon,
  Map as MapIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Business as BusinessIcon,
  ExpandMore as ExpandMoreIcon,
  CorporateFare as OrgIcon,
  AdminPanelSettings as PlatformIcon,
  Videocam as SimulationIcon,
} from '@mui/icons-material';
import {
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';

import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { useNotificationStore } from '../store/notificationStore';

const drawerWidth = 260;

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contextAnchorEl, setContextAnchorEl] = useState<null | HTMLElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, contexts, switchContext } = useAuthStore();
  const { connected } = useSocketStore();
  const { unreadCount } = useNotificationStore();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleContextOpen = (event: React.MouseEvent<HTMLElement>) => {
    setContextAnchorEl(event.currentTarget);
  };

  const handleContextClose = () => {
    setContextAnchorEl(null);
  };

  const handleContextSwitch = async (propertyId: number) => {
    handleContextClose();
    await switchContext(propertyId);
  };

  const currentContextName = contexts.find(c => c.propertyId === user?.property_id)?.propertyName || 'Primary Property';

  const getMenuItems = () => {
    const baseItems = [
      { text: 'Command Center', icon: DashboardIcon, path: '/dashboard' },
      { text: 'Incidents', icon: WarningIcon, path: '/dashboard/incidents' },
      { text: 'Triage & Safety', icon: HealingIcon, path: '/dashboard/triage' },
      { text: 'Live Map', icon: MapIcon, path: '/dashboard/locations' },
      { text: 'Personnel', icon: PeopleIcon, path: '/dashboard/users' },
      { text: 'Notifications', icon: NotificationsIcon, path: '/dashboard/notifications' },
      { text: 'Simulation', icon: SimulationIcon, path: '/dashboard/simulation' },
    ];

    const menu = [...baseItems];

    if (user?.role === 'org_admin') {
      menu.push({ text: 'My Organization', icon: OrgIcon, path: '/dashboard/organization' });
    }

    if (user?.role === 'super_admin') {
      menu.push({ text: 'Platform Admin', icon: PlatformIcon, path: '/dashboard/platform' });
    }

    menu.push({ text: 'Settings', icon: SettingsIcon, path: '/dashboard/settings' });
    return menu;
  };

  const menuItems = getMenuItems();

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ justifyContent: 'center', py: 2.5 }}>
        <Typography variant="h1" sx={{ color: 'var(--text-primary)', fontSize: '1.25rem', letterSpacing: '0.08em', fontFamily: 'var(--font-brand)', fontWeight: 700 }}>
          CRISIS<span style={{ color: 'var(--accent-gold)' }}>RESPOND</span>
        </Typography>
      </Toolbar>
      
      <Box sx={{ px: 3, mb: 3 }}>
        <Box 
          sx={{ 
            p: 1.5, 
            borderRadius: 2, 
            border: '1px solid var(--border-medium)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            background: 'var(--bg-card)'
          }}
        >
          <Box className={`status-dot ${connected ? 'status-dot--live' : 'status-dot--alert'}`} />
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', letterSpacing: '0.14em' }}>
            {connected ? 'System Online (Live)' : 'Reconnecting...'}
          </Typography>
        </Box>
      </Box>

      <List sx={{ px: 2, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  border: '1px solid transparent',
                  transition: 'all 0.22s ease',
                  '&.Mui-selected': {
                    borderColor: 'var(--border-medium)',
                    backgroundColor: 'rgba(246, 211, 101, 0.12)',
                    '&:hover': {
                      backgroundColor: 'rgba(246, 211, 101, 0.18)',
                    }
                  },
                  '&:hover': {
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'rgba(246, 211, 101, 0.06)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.path === '/dashboard/notifications' && unreadCount > 0 ? (
                    <Badge badgeContent={unreadCount} color="error" variant="dot">
                      <Icon sx={{ color: isActive ? 'var(--accent-gold)' : 'text.secondary' }} />
                    </Badge>
                  ) : (
                    <Icon sx={{ color: isActive ? 'var(--accent-gold)' : 'text.secondary' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={<Typography sx={{ fontSize: '0.9rem', fontWeight: isActive ? 600 : 500, color: isActive ? 'text.primary' : 'text.secondary' }}>{item.text}</Typography>}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid var(--border-subtle)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, mb: 1, border: '1px solid var(--border-subtle)', borderRadius: 2, background: 'var(--bg-card)' }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(246, 211, 101, 0.22)', color: 'var(--accent-gold)' }}>{user?.name?.charAt(0) || 'U'}</Avatar>
          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>{user?.name || 'Admin User'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.08em' }}>
              {user?.role || 'Administrator'}
            </Typography>
          </Box>
        </Box>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, color: 'text.secondary', border: '1px solid var(--border-subtle)', '&:hover': { borderColor: 'var(--border-medium)', color: 'var(--text-primary)' } }}>
          <ListItemIcon sx={{ minWidth: 40 }}><LogoutIcon fontSize="small" sx={{ color: 'inherit' }} /></ListItemIcon>
          <ListItemText primary={<Typography sx={{ fontSize: '0.85rem' }}>Sign Out</Typography>} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: 'rgba(10, 13, 18, 0.74)',
        }}
      >
        <Toolbar sx={{ pr: '24px', minHeight: 72 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography component="h1" variant="h6" color="inherit" noWrap sx={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '1.45rem' }}>
              {menuItems.find(m => m.path === location.pathname)?.text || 'Dashboard'}
            </Typography>
            
            {contexts.length > 1 && (
              <>
                <Divider orientation="vertical" flexItem sx={{ my: 2, borderColor: 'var(--border-subtle)' }} />
                <Chip
                  icon={<BusinessIcon sx={{ color: 'inherit !important', fontSize: '1.1rem !important' }} />}
                  label={currentContextName}
                  onClick={handleContextOpen}
                  onDelete={handleContextOpen}
                  deleteIcon={<ExpandMoreIcon sx={{ color: 'inherit !important' }} />}
                  sx={{ 
                    backgroundColor: 'var(--bg-card)', 
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    border: '1px solid var(--border-subtle)',
                    '&:hover': { backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-medium)' }
                  }}
                />
                <Menu
                  anchorEl={contextAnchorEl}
                  open={Boolean(contextAnchorEl)}
                  onClose={handleContextClose}
                  slotProps={{ paper: { sx: { minWidth: 220, mt: 1, background: 'var(--bg-card)', border: '1px solid var(--border-medium)' } } }}
                >
                  <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary', fontSize: '0.6rem' }}>
                    Switch Property
                  </Typography>
                  {contexts.map((ctx) => (
                    <MenuItem 
                      key={ctx.propertyId} 
                      selected={ctx.propertyId === user?.property_id}
                      onClick={() => handleContextSwitch(ctx.propertyId)}
                      sx={{ py: 1.5 }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{ctx.propertyName}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{ctx.role}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
          </Box>
          
          <Tooltip title="Notifications">
          <IconButton color="inherit" onClick={() => navigate('/dashboard/notifications')} sx={{ border: '1px solid var(--border-subtle)', borderRadius: 2 }}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          pt: '88px',
          px: { xs: 2, sm: 4 },
          pb: 4,
          position: 'relative'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
