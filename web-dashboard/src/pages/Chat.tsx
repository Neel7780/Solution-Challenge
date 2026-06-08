import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  IconButton,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  Chat as ChatIcon,
  Business as PropertyIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ChatMessage {
  id: number;
  property_id: number;
  user_id: number;
  message: string;
  created_at: string;
  user_name: string;
  user_role: string;
}

export default function Chat() {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { socket, joinProperty } = useSocketStore();
  const [activePropertyId, setActivePropertyId] = useState<number | ''>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');

  // 1. Fetch properties (for Org Admin & Super Admin)
  const { data: properties = [], isLoading: loadingProps } = useQuery({
    queryKey: ['chat-properties'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/dashboard/organization/properties`);
      return res.data.properties;
    },
    enabled: user?.role === 'org_admin' || user?.role === 'super_admin',
  });

  // 2. Determine initial property
  useEffect(() => {
    if (user?.role !== 'org_admin' && user?.role !== 'super_admin' && user?.property_id) {
      setActivePropertyId(user.property_id);
    } else if (properties.length > 0 && activePropertyId === '') {
      setActivePropertyId(properties[0].id);
    }
  }, [user, properties, activePropertyId]);

  // 3. Join Socket room whenever property context changes
  useEffect(() => {
    if (activePropertyId && socket) {
      joinProperty(Number(activePropertyId));
    }
  }, [activePropertyId, socket, joinProperty]);

  // 4. Fetch Chat History
  const { isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['chat-history', activePropertyId],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/chat/property/${activePropertyId}`);
      setMessages(res.data.chat || []);
      return res.data.chat;
    },
    enabled: !!activePropertyId,
  });

  // 5. Listen to socket chat notifications
  useEffect(() => {
    if (!socket || !activePropertyId) return;

    const handleNewMessage = (msg: ChatMessage) => {
      if (Number(msg.property_id) === Number(activePropertyId)) {
        setMessages((prev) => {
          // Prevent duplicates if already inserted locally
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('new_chat_message', handleNewMessage);
    return () => {
      socket.off('new_chat_message', handleNewMessage);
    };
  }, [socket, activePropertyId]);

  // 6. Send message mutation
  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      axios.post(`${API_URL}/chat/property/${activePropertyId}`, { message: text }),
    onSuccess: (res) => {
      const sentMsg = res.data.message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
      setNewMessageText('');
    },
  });

  // 7. Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 8. Animations
  useGSAP(() => {
    gsap.from('.chat-panel', {
      y: 20,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
    });
  }, { scope: containerRef });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return '#7c3aed';
      case 'org_admin': return 'var(--accent-blue)';
      case 'admin': return 'var(--accent-gold)';
      case 'responder': return 'var(--accent-red)';
      case 'security': return '#fb923c';
      case 'staff': return 'var(--accent-green)';
      default: return '#94a3b8';
    }
  };

  const handleSendMessage = () => {
    if (newMessageText.trim() === '' || sendMutation.isPending) return;
    sendMutation.mutate(newMessageText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const activeProperty = properties.find((p: any) => p.id === activePropertyId);

  const isMobileGuest = user?.role === 'guest';

  return (
    <Box 
      ref={containerRef} 
      sx={{ 
        height: isMobileGuest ? 'calc(100dvh - 140px)' : 'calc(100vh - 120px)', 
        display: 'flex', 
        flexDirection: 'column' 
      }}
    >
      {/* Header Panel */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h2" sx={{ fontSize: '1.5rem', fontWeight: 400, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ChatIcon sx={{ color: 'var(--accent-blue)' }} /> Property Comms Center
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
            Real-time secure coordinate radio room for active personnel
          </Typography>
        </Box>

        {(user?.role === 'org_admin' || user?.role === 'super_admin') && properties.length > 0 && (
          <Box sx={{ minWidth: 220 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="chat-property-select-label">Property Channel</InputLabel>
              <Select
                labelId="chat-property-select-label"
                value={activePropertyId}
                label="Property Channel"
                onChange={(e) => setActivePropertyId(Number(e.target.value))}
              >
                {properties.map((p: any) => (
                  <MenuItem key={p.id} value={p.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PropertyIcon fontSize="small" sx={{ opacity: 0.7 }} />
                      {p.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>

      {/* Main chat window container */}
      <Paper
        className="chat-panel"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-soft)',
          overflow: 'hidden',
          borderRadius: 1.5,
          position: 'relative'
        }}
      >
        {/* Subheader status bar */}
        <Box sx={{ px: 3, py: 1.5, borderBottom: '1px solid var(--border-medium)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent-green)', boxShadow: '0 0 8px var(--accent-green)' }} />
            <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {user?.role === 'admin' || user?.role === 'staff' || user?.role === 'security' || user?.role === 'responder'
                ? `Active Channel: ${user?.property_name || 'My Property'}`
                : activeProperty ? `Channel Monitor: ${activeProperty.name}` : 'Loading Channel...'}
            </Typography>
          </Stack>
          <Chip
            size="small"
            icon={<PeopleIcon sx={{ color: 'inherit !important', fontSize: '0.8rem' }} />}
            label="Property Radio Broadcast"
            sx={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          />
        </Box>

        {/* Message bubble stream */}
        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.002) 0%, rgba(255,255,255,0) 100%)',
          }}
        >
          {loadingHistory ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Retrieving secure logs...</Typography>
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 1.5, opacity: 0.5 }}>
              <ChatIcon sx={{ fontSize: 36, color: 'var(--text-muted)' }} />
              <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>No radio transmissions logged on this channel.</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Type a message below to broadcast to all personnel.</Typography>
            </Box>
          ) : (
            messages.map((msg) => {
              const isCurrentUser = msg.user_id === user?.id;
              const color = getRoleColor(msg.user_role);
              return (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    maxWidth: '80%',
                    alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: color, color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {msg.user_name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5, justifyContent: isCurrentUser ? 'flex-end' : 'flex-start' }}>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{msg.user_name}</Typography>
                      <Box sx={{
                        fontSize: '0.55rem',
                        px: 0.8,
                        py: 0.1,
                        borderRadius: '2px',
                        fontWeight: 700,
                        backgroundColor: `${color}15`,
                        color: color,
                        border: `1px solid ${color}30`,
                        textTransform: 'uppercase'
                      }}>
                        {msg.user_role.replace('_', ' ')}
                      </Box>
                      <Typography sx={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    <Paper
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        borderTopRightRadius: isCurrentUser ? 0 : 1.5,
                        borderTopLeftRadius: isCurrentUser ? 1.5 : 0,
                        backgroundColor: isCurrentUser ? 'rgba(0, 121, 193, 0.15)' : 'rgba(255,255,255,0.02)',
                        border: isCurrentUser ? '1px solid rgba(0, 121, 193, 0.3)' : '1px solid var(--border-medium)',
                        color: 'rgba(255,255,255,0.95)',
                        fontSize: '0.85rem',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.message}
                    </Paper>
                  </Box>
                </Box>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input Control Box */}
        <Box sx={{ p: 2, borderTop: '1px solid var(--border-medium)', backgroundColor: 'rgba(255,255,255,0.005)' }}>
          <Stack direction="row" spacing={1.5}>
            <TextField
              placeholder="Type radio dispatch..."
              variant="outlined"
              size="small"
              fullWidth
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sendMutation.isPending || !activePropertyId}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  '& fieldset': { borderColor: 'var(--border-medium)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--accent-blue)' },
                }
              }}
            />
            <IconButton
              color="primary"
              disabled={sendMutation.isPending || newMessageText.trim() === '' || !activePropertyId}
              onClick={handleSendMessage}
              sx={{
                bgcolor: newMessageText.trim() !== '' ? 'rgba(0, 121, 193, 0.1)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.05)',
                '&:hover': { bgcolor: 'rgba(0, 121, 193, 0.2)' }
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
