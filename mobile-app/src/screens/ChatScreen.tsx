import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config';

interface ChatMessage {
  id: number;
  property_id: number;
  user_id: number;
  message: string;
  created_at: string;
  user_name: string;
  user_role: string;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const propertyId = user?.property_id || 2;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchHistory();
  }, [propertyId]);

  useEffect(() => {
    if (!socket || !propertyId) return;

    // We join the property channel on connection inside SocketContext
    // so we just need to listen here.
    const handleNewMessage = (msg: ChatMessage) => {
      if (Number(msg.property_id) === Number(propertyId)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    socket.on('new_chat_message', handleNewMessage);
    return () => {
      socket.off('new_chat_message', handleNewMessage);
    };
  }, [socket, propertyId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/chat/property/${propertyId}`);
      setMessages(res.data.chat || []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (err) {
      console.warn('Failed to fetch chat history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    try {
      setSending(true);
      const text = inputText.trim();
      setInputText(''); // optimistic clear
      
      const res = await axios.post(`${API_URL}/chat/property/${propertyId}`, { message: text });
      const sentMsg = res.data.message;
      
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.warn('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return '#7c3aed';
      case 'org_admin': return '#3b82f6';
      case 'admin': return '#eab308';
      case 'responder': return '#ef4444';
      case 'security': return '#f97316';
      case 'staff': return '#10b981';
      default: return '#94a3b8';
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isCurrentUser = item.user_id === user?.id;
    const roleColor = getRoleColor(item.user_role);

    return (
      <View style={[styles.messageWrapper, isCurrentUser ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
        {!isCurrentUser && (
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            <Text style={styles.avatarText}>{item.user_name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        
        <View style={[styles.messageBubble, isCurrentUser ? styles.bubbleRight : styles.bubbleLeft]}>
          {!isCurrentUser && (
            <View style={styles.messageHeader}>
              <Text style={styles.senderName}>{item.user_name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: `${roleColor}20`, borderColor: `${roleColor}50` }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>{item.user_role.replace('_', ' ')}</Text>
              </View>
            </View>
          )}
          <Text style={[styles.messageText, isCurrentUser && styles.messageTextRight]}>{item.message}</Text>
          <Text style={[styles.timestamp, isCurrentUser && styles.timestampRight]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="chat" size={24} color="#3b82f6" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Property Radio</Text>
          <Text style={styles.headerSubtitle}>Secure Broadcast Channel</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#d32f2f" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onLayout={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100)}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="chat-bubble-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyText}>No radio transmissions logged.</Text>
            </View>
          }
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type message..."
          placeholderTextColor="#94a3b8"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <Icon name="send" size={20} color={inputText.trim() ? '#fff' : '#cbd5e1'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  emptyText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  messageWrapperLeft: {
    alignSelf: 'flex-start',
  },
  messageWrapperRight: {
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  bubbleLeft: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bubbleRight: {
    backgroundColor: '#3b82f6',
    borderTopRightRadius: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 20,
  },
  messageTextRight: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  timestampRight: {
    color: '#93c5fd',
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: '#0f172a',
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f1f5f9',
  },
});
