import React, { useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
} from '@mui/material';
import { DeleteOutlined as DeleteIcon, Circle as UnreadIcon } from '@mui/icons-material';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useNotificationStore } from '../../store/notificationStore';

export default function GuestNotifications() {
  const containerRef = useRef(null);
  const { notifications, markAsRead, clearAll, markAllRead } = useNotificationStore();

  useEffect(() => {
    // Mark all read when visiting the alerts tab
    markAllRead();
  }, [markAllRead]);

  useGSAP(() => {
    gsap.from('.notif-item', {
      x: -50,
      opacity: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power2.out',
    });
  }, { scope: containerRef, dependencies: [notifications.length] });

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return { color: '#ef4444', border: '#ef4444' };
      case 'high': return { color: '#f59e0b', border: '#f59e0b' };
      case 'info': return { color: '#3b82f6', border: '#3b82f6' };
      default: return { color: '#94a3b8', border: '#94a3b8' };
    }
  };

  return (
    <Box ref={containerRef} sx={{ maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h2" sx={{ fontSize: '1.75rem' }}>
          Alerts
        </Typography>
        {notifications.length > 0 && (
          <IconButton onClick={clearAll} color="inherit" size="small">
            <DeleteIcon />
          </IconButton>
        )}
      </Box>

      {notifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No active alerts.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {notifications.map((n) => {
            const style = getSeverityStyle(n.severity);
            return (
              <Card 
                key={n.id} 
                className="glass notif-item" 
                sx={{ 
                  borderLeft: `4px solid ${style.border}`,
                  position: 'relative'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: style.color }}>
                      {n.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.primary">
                    {n.message}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
