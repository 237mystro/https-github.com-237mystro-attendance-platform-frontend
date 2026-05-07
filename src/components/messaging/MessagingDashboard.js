import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, CircularProgress, IconButton,
  InputAdornment, List, ListItemButton, TextField, Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  ArrowBack, Campaign, ChatBubbleOutline, Close, Search
} from '@mui/icons-material';
import Conversation from './Conversation';
import AnnouncementFeed from './AnnouncementFeed';
import { useSocket } from '../../contexts/SocketContext';
import { apiRequest } from '../../utils/api';
import { getStoredUser } from '../../utils/authSession';

const AVATAR_COLORS = ['#1976d2','#388e3c','#d32f2f','#f57c00','#7b1fa2','#0288d1','#c2185b','#00796b'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const getUserId = (user) => user?.id || user?._id;
const roleLabel = (role) => ({
  admin: 'Boss',
  hr: 'HR',
  branch_manager: 'Manager',
  branch_hr: 'Branch HR',
  employee: 'Employee'
}[role] || role);
const roleTone = (role) => ({
  admin: { bg: '#fff1c2', color: '#9a6700' },
  hr: { bg: '#ede9fe', color: '#6d28d9' },
  branch_manager: { bg: '#dcfce7', color: '#166534' },
  branch_hr: { bg: '#dbeafe', color: '#1d4ed8' },
  employee: { bg: '#e2e8f0', color: '#475569' }
}[role] || { bg: '#e2e8f0', color: '#475569' });

const ContactItem = ({ conversation, selected, onClick }) => {
  const { user, lastMessage, unreadCount } = conversation;
  const name = user?.name || '';
  const hasUnread = unreadCount > 0;
  const timeStr = lastMessage?.createdAt
    ? new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const tone = roleTone(user?.role);

  return (
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{
        px: 2, py: 1.5,
        borderBottom: '1px solid #f0f4f8',
        '&.Mui-selected': { bgcolor: 'rgba(25,118,210,0.08)' },
        '&.Mui-selected:hover': { bgcolor: 'rgba(25,118,210,0.12)' }
      }}
    >
      <Avatar
        src={user?.avatarUrl || undefined}
        sx={{
          bgcolor: avatarColor(name),
          mr: 1.5,
          width: 46,
          height: 46,
          fontWeight: 700,
          fontSize: 19,
          flexShrink: 0,
          border: ['admin', 'hr', 'branch_manager', 'branch_hr'].includes(user?.role) ? `2px solid ${tone.color}` : 'none'
        }}
      >
        {name.charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="subtitle2" fontWeight={hasUnread ? 700 : 500} noWrap sx={{ maxWidth: '68%' }}>
            {name}
          </Typography>
          <Typography variant="caption" sx={{ color: hasUnread ? 'primary.main' : 'text.disabled', fontWeight: hasUnread ? 600 : 400, flexShrink: 0, ml: 0.5 }}>
            {timeStr}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, mb: 0.2, flexWrap: 'wrap' }}>
          <Box
            sx={{
              px: 0.85,
              py: 0.2,
              borderRadius: 999,
              bgcolor: tone.bg,
              color: tone.color,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: 0.2
            }}
          >
            {roleLabel(user?.role)}
          </Box>
          {user?.position && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 120 }}>
              {user.position}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}>
          <Typography variant="body2" noWrap sx={{ color: hasUnread ? 'text.primary' : 'text.secondary', fontWeight: hasUnread ? 500 : 400, maxWidth: hasUnread ? '82%' : '100%' }}>
            {lastMessage?.content || <em style={{ opacity: 0.5, fontSize: 13 }}>No messages yet</em>}
          </Typography>
          {hasUnread && (
            <Box sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: '50%', minWidth: 20, height: 20, px: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </ListItemButton>
  );
};

const MessagingDashboard = () => {
  const theme = useTheme();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('chats');
  const { unreadCount, setUnreadCount } = useSocket();
  const typingTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const fetchConversations = useCallback(async ({ showLoader = true } = {}) => {
    try {
      if (showLoader) setLoading(true);
      setError('');
      const data = await apiRequest('/messages/contacts');
      if (data.success) setConversations(data.contacts || []);
      else setError(data.message || 'Failed to fetch conversations');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const fetchMessages = async (userId) => {
    try {
      setError('');
      const data = await apiRequest(`/messages/${userId}`);
      if (data.success) setMessages(data.messages || []);
      else setError(data.message || 'Failed to fetch messages');
    } catch {
      setError('Network error. Please try again.');
    }
  };

  const sendMessage = async (messageData) => {
    if (!selectedConversation) return;
    try {
      setError('');
      const receiverId = getUserId(selectedConversation.user);
      const formData = new FormData();
      formData.append('receiverId', receiverId);
      formData.append('content', messageData.content);
      (messageData.attachments || []).forEach(att => formData.append('files', att.file));

      const data = await apiRequest('/messages/send', { method: 'POST', body: formData });

      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        fetchConversations({ showLoader: false });
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (err) {
      setError(err.message || 'Failed to send message. Please try again.');
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setActiveTab('chats');
    fetchMessages(getUserId(conversation.user));
    if (conversation.unreadCount > 0) {
      setConversations(prev =>
        prev.map(c => getUserId(c.user) === getUserId(conversation.user) ? { ...c, unreadCount: 0 } : c)
      );
    }
  };

  // Ref keeps the latest selectedConversation available inside stable event listeners
  const selectedConversationRef = useRef(null);
  useEffect(() => { selectedConversationRef.current = selectedConversation; }, [selectedConversation]);

  useEffect(() => {
    fetchConversations();

    const onNewMessage = (event) => {
      const message = event.detail?.message || event.detail;
      const selectedUserId = getUserId(selectedConversationRef.current?.user);
      const senderId = message?.sender?._id || message?.sender?.id || message?.sender;
      if (selectedUserId && senderId === selectedUserId) {
        setMessages(prev =>
          prev.some(m => m._id && m._id === message._id) ? prev : [...prev, message]
        );
      }
      fetchConversations({ showLoader: false });
      setUnreadCount(prev => prev + 1);
    };

    const onTypingStart = (event) => {
      const { senderId } = event.detail;
      const conv = selectedConversationRef.current;
      if (!conv || getUserId(conv.user) !== senderId) return;
      const userName = conv.user.name;
      setTypingUsers(prev => prev.includes(userName) ? prev : [...prev, userName]);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() =>
        setTypingUsers(prev => prev.filter(n => n !== userName)), 3000);
    };

    const onTypingStop = (event) => {
      const { senderId } = event.detail;
      const conv = selectedConversationRef.current;
      if (!conv || getUserId(conv.user) !== senderId) return;
      setTypingUsers(prev => prev.filter(n => n !== conv.user.name));
    };

    window.addEventListener('newMessageReceived', onNewMessage);
    window.addEventListener('userTypingStart', onTypingStart);
    window.addEventListener('userTypingStop', onTypingStop);

    return () => {
      window.removeEventListener('newMessageReceived', onNewMessage);
      window.removeEventListener('userTypingStart', onTypingStart);
      window.removeEventListener('userTypingStop', onTypingStop);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [fetchConversations, setUnreadCount]);

  const filteredConversations = conversations
    .filter(c =>
      c.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (a.lastMessage && b.lastMessage) return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      return 0;
    });

  // Mobile visibility: sidebar shows on chats tab with no conversation; hides on announcements tab or when conversation open
  const mobileSidebarVisible = activeTab === 'chats' && !selectedConversation;
  const panelColor = theme.palette.background.paper;
  const pageColor = theme.palette.mode === 'dark' ? '#0d1626' : '#eef2f7';
  const borderColor = theme.palette.divider;

  const switchToAnnouncements = () => {
    setActiveTab('announcements');
    setSelectedConversation(null);
  };

  const switchToChats = () => {
    setActiveTab('chats');
  };

  return (
    <Box
      sx={{
        height: { xs: 'calc(100dvh - 56px)', sm: 'calc(100dvh - 64px)' },
        minHeight: { xs: 'calc(100dvh - 56px)', sm: 'calc(100dvh - 64px)' },
        display: 'flex',
        bgcolor: pageColor,
        overflow: 'hidden'
      }}
    >

      {/* ── Sidebar ── */}
      <Box sx={{
        width: { xs: '100%', md: 340 },
        minWidth: { md: 300 },
        display: { xs: mobileSidebarVisible ? 'flex' : 'none', md: 'flex' },
        flexDirection: 'column',
        bgcolor: panelColor,
        borderRight: `1px solid ${borderColor}`,
        flexShrink: 0
      }}>
        {/* Gradient header */}
        <Box sx={{ p: 2, background: 'linear-gradient(135deg,#1565c0 0%,#1976d2 60%,#42a5f5 100%)', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChatBubbleOutline sx={{ fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 0.3 }}>Messages</Typography>
              {unreadCount > 0 && (
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.28)', borderRadius: 2, px: 0.75, py: 0.1 }}>
                  <Typography variant="caption" fontWeight={700}>{unreadCount}</Typography>
                </Box>
              )}
            </Box>
            {currentUser?.role === 'admin' && activeTab === 'announcements' && (
              <Button
                size="small"
                startIcon={<Campaign sx={{ fontSize: 14 }} />}
                onClick={() => navigate('/admin/messaging/announcements')}
                sx={{ color: 'white', fontSize: 11, py: 0.4, px: 1, border: '1px solid rgba(255,255,255,0.45)', textTransform: 'none', borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: 'white' } }}
              >
                New
              </Button>
            )}
          </Box>

          {/* Tab switcher */}
          <Box sx={{ display: 'flex', bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 2, p: 0.5 }}>
            {[{ key: 'chats', label: 'Messages' }, { key: 'announcements', label: 'Announcements' }].map(tab => (
              <Box
                key={tab.key}
                onClick={() => tab.key === 'announcements' ? switchToAnnouncements() : switchToChats()}
                sx={{
                  flex: 1, py: 0.75, textAlign: 'center', cursor: 'pointer', borderRadius: 1.5,
                  bgcolor: activeTab === tab.key ? panelColor : 'transparent',
                  color: activeTab === tab.key ? '#1565c0' : 'rgba(255,255,255,0.75)',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  fontSize: 12.5,
                  transition: 'all 0.2s ease',
                  userSelect: 'none'
                }}
              >
                {tab.label}
              </Box>
            ))}
          </Box>

          {/* Search bar — only show on chats tab */}
          {activeTab === 'chats' && (
            <TextField
              fullWidth size="small"
              placeholder="Search people…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              sx={{ mt: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 18 }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ color: 'rgba(255,255,255,0.65)', p: 0.25 }}>
                      <Close sx={{ fontSize: 15 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 3, color: 'white',
                  '& input': { color: 'white', fontSize: 14, '&::placeholder': { color: 'rgba(255,255,255,0.65)', opacity: 1 } },
                  '& fieldset': { border: 'none' }
                }
              }}
            />
          )}
        </Box>

        {/* Contact list — only on chats tab */}
        {activeTab === 'chats' && (
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
                <CircularProgress size={30} />
              </Box>
            ) : filteredConversations.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.disabled">
                  {searchTerm ? 'No contacts match your search' : 'No contacts yet'}
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {filteredConversations.map(conv => (
                  <ContactItem
                    key={getUserId(conv.user)}
                    conversation={conv}
                    selected={getUserId(selectedConversation?.user) === getUserId(conv.user)}
                    onClick={() => handleSelectConversation(conv)}
                  />
                ))}
              </List>
            )}
          </Box>
        )}

        {/* Announcements hint in sidebar when on announcements tab (desktop) */}
        {activeTab === 'announcements' && (
          <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 3, color: 'text.disabled', gap: 1 }}>
            <Campaign sx={{ fontSize: 40, color: '#ffa726', opacity: 0.5 }} />
            <Typography variant="body2" textAlign="center" sx={{ maxWidth: 200, lineHeight: 1.5 }}>
              Company announcements are shown on the right
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Main panel ── */}
      <Box sx={{
        flex: 1,
        display: { xs: mobileSidebarVisible ? 'none' : 'flex', md: 'flex' },
        flexDirection: 'column',
        minWidth: 0
      }}>
        {activeTab === 'announcements' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Announcements header */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: panelColor, borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 1, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <IconButton size="small" onClick={switchToChats} sx={{ display: { md: 'none' }, mr: 0.25 }}>
                <ArrowBack />
              </IconButton>
              <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Campaign sx={{ color: '#f57c00', fontSize: 20 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>Announcements</Typography>
                <Typography variant="caption" color="text.secondary">Company-wide broadcasts</Typography>
              </Box>
              {currentUser?.role === 'admin' && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Campaign sx={{ fontSize: 15 }} />}
                  onClick={() => navigate('/admin/messaging/announcements')}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 2, background: 'linear-gradient(135deg,#f57c00,#ffa726)', boxShadow: '0 4px 12px rgba(245,124,0,0.35)', '&:hover': { background: 'linear-gradient(135deg,#e65100,#f57c00)' } }}
                >
                  New Announcement
                </Button>
              )}
            </Box>

            {/* Feed */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1.5, md: 2 }, bgcolor: alpha(pageColor, 0.92) }}>
              <AnnouncementFeed />
            </Box>
          </Box>
        ) : (
          <Conversation
            participant={selectedConversation?.user || null}
            messages={messages}
            onSendMessage={sendMessage}
            typingUsers={typingUsers}
            onBack={() => setSelectedConversation(null)}
          />
        )}
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ position: 'fixed', bottom: 20, right: 20, maxWidth: 380, zIndex: 9999, boxShadow: 4 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default MessagingDashboard;
