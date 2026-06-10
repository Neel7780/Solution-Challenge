import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, Button, AlertTitle, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore, type AppNotification } from '../store/notificationStore';

export default function NotificationToast() {
  const navigate = useNavigate();
  const { notifications } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const [currentNotif, setCurrentNotif] = useState<AppNotification | null>(null);

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      // Only show if it was created in the last 5 seconds to avoid showing old ones on mount
      const isNew = (Date.now() - new Date(latest.timestamp).getTime()) < 5000;
      
      if (isNew && (!currentNotif || latest.id !== currentNotif.id)) {
        setCurrentNotif(latest);
        setOpen(true);
      }
    }
  }, [notifications, currentNotif]);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const handleAction = () => {
    setOpen(false);
    if (currentNotif?.type === 'crisis' || currentNotif?.type === 'panic') {
      navigate('/dashboard/incidents');
    } else {
      navigate('/dashboard/notifications');
    }
  };

  if (!currentNotif) return null;

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{ mb: 2, mr: 2 }}
    >
      <Alert 
        onClose={handleClose} 
        severity={
          currentNotif.severity === 'critical'
            ? 'error'
            : currentNotif.severity === 'high'
            ? 'warning'
            : currentNotif.severity === 'success'
            ? 'success'
            : 'info'
        }
        variant="filled"
        sx={{ 
          width: '100%', 
          minWidth: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
        action={
          <Button color="inherit" size="small" onClick={handleAction} sx={{ fontWeight: 700 }}>
            VIEW
          </Button>
        }
      >
        <AlertTitle sx={{ fontWeight: 800, letterSpacing: '0.02em', fontSize: '0.9rem' }}>
          {currentNotif.title}
        </AlertTitle>
        <Typography variant="body2" sx={{ fontSize: '0.85rem', opacity: 0.9 }}>
          {currentNotif.message}
        </Typography>
      </Alert>
    </Snackbar>
  );
}
