import React, { useEffect, useRef, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Typography
} from '@mui/material';
import { ArrowBack, Description, DoneAll, Forum } from '@mui/icons-material';
import MessageInput from './MessageInput';
import { getStoredUser } from '../../utils/authSession';

const AVATAR_COLORS = ['#1976d2', '#388e3c', '#d32f2f', '#f57c00', '#7b1fa2', '#0288d1', '#c2185b', '#00796b'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
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

const TypingDots = () => (
  <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center', px: 0.5 }}>
    {[0, 1, 2].map((i) => (
      <Box
        key={i}
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: 'text.disabled',
          animation: 'msgBounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
          '@keyframes msgBounce': {
            '0%, 80%, 100%': { transform: 'scale(0.7)', opacity: 0.5 },
            '40%': { transform: 'scale(1)', opacity: 1 }
          }
        }}
      />
    ))}
  </Box>
);

const Conversation = ({ participant, messages, onSendMessage, typingUsers = [], onBack }) => {
  const messagesEndRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const currentUser = getStoredUser() || {};
  const currentUserId = currentUser._id || currentUser.id;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const formatTime = (dateValue) =>
    new Date(dateValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  if (!participant) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', bgcolor: '#eef2f7', gap: 2, userSelect: 'none' }}>
        <Box sx={{ p: 3.5, borderRadius: '50%', bgcolor: 'rgba(25,118,210,0.10)', display: 'flex' }}>
          <Forum sx={{ fontSize: 60, color: 'primary.light' }} />
        </Box>
        <Typography variant="h6" color="text.secondary" fontWeight={500}>Select a conversation</Typography>
        <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 260, textAlign: 'center' }}>
          Pick a contact from the left panel to start or continue a chat.
        </Typography>
      </Box>
    );
  }

  const name = participant.name || '';
  const tone = roleTone(participant.role);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white' }}>
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          borderBottom: '1px solid #dde3ed',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          bgcolor: 'white',
          zIndex: 1
        }}
      >
        <IconButton size="small" onClick={onBack} sx={{ display: { md: 'none' }, mr: 0.25 }}>
          <ArrowBack />
        </IconButton>
        <Avatar
          src={participant.avatarUrl || undefined}
          sx={{
            bgcolor: avatarColor(name),
            width: 42,
            height: 42,
            fontWeight: 700,
            fontSize: 18,
            border: ['admin', 'hr', 'branch_manager', 'branch_hr'].includes(participant.role) ? `2px solid ${tone.color}` : 'none'
          }}
        >
          {name.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={600} noWrap>{name}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
            <Box
              sx={{
                px: 0.9,
                py: 0.2,
                borderRadius: 999,
                bgcolor: tone.bg,
                color: tone.color,
                fontSize: 10.5,
                fontWeight: 700
              }}
            >
              {roleLabel(participant.role)}
            </Box>
            <Typography variant="caption" color="text.secondary" noWrap>
              {participant.position || participant.role} · {participant.company}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 1.5, md: 2 }, py: 2, bgcolor: '#f0f4f8', minHeight: 0 }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="body2" color="text.disabled">No messages yet. Say hello.</Typography>
          </Box>
        ) : (
          <>
            {messages.map((message, index) => {
              const senderId = message.sender?._id || message.sender?.id || message.sender;
              const isMe = senderId === currentUserId;
              const showDate =
                index === 0 ||
                new Date(messages[index - 1].createdAt).toDateString() !== new Date(message.createdAt).toDateString();

              return (
                <React.Fragment key={message._id || `${message.createdAt}-${index}`}>
                  {showDate && (
                    <Box sx={{ textAlign: 'center', my: 2 }}>
                      <Chip
                        label={formatDate(message.createdAt)}
                        size="small"
                        sx={{ bgcolor: 'rgba(0,0,0,0.07)', fontSize: 11, fontWeight: 500, height: 22 }}
                      />
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', mb: 0.5, alignItems: 'flex-end', gap: 0.75 }}>
                    {!isMe && (
                      <Avatar
                        src={participant.avatarUrl || undefined}
                        sx={{ width: 28, height: 28, bgcolor: avatarColor(name), fontSize: 12, fontWeight: 700, flexShrink: 0 }}
                      >
                        {name.charAt(0).toUpperCase()}
                      </Avatar>
                    )}

                    <Box sx={{ maxWidth: { xs: '80%', md: '65%' } }}>
                      {message.isAnnouncement && (
                        <Chip label="Announcement" size="small" color="warning" sx={{ mb: 0.5, fontWeight: 600, fontSize: 11 }} />
                      )}

                      <Box
                        sx={{
                          px: 1.75,
                          py: 1,
                          bgcolor: message.isAnnouncement ? '#fff8e1' : isMe ? '#1976d2' : 'white',
                          color: isMe && !message.isAnnouncement ? 'white' : 'text.primary',
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                          border: message.isAnnouncement ? '1.5px solid #ffc107' : 'none',
                          wordBreak: 'break-word'
                        }}
                      >
                        {message.content && (
                          <Typography variant="body2" sx={{ lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                            {message.content}
                          </Typography>
                        )}

                        {(() => {
                          const files = message.files?.length > 0
                            ? message.files
                            : message.fileUrl
                              ? [{ url: message.fileUrl, name: message.fileName || 'Attachment', type: message.fileType || 'other' }]
                              : [];

                          return files.map((file, fileIndex) =>
                            file.type === 'image' ? (
                              <Box key={fileIndex} sx={{ mt: message.content ? 0.75 : 0 }}>
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 10, cursor: 'pointer', display: 'block' }}
                                  onClick={(event) => {
                                    setImagePreview(file.url);
                                    event.stopPropagation();
                                  }}
                                />
                              </Box>
                            ) : (
                              <Chip
                                key={fileIndex}
                                icon={<Description sx={{ fontSize: 15 }} />}
                                label={file.name || 'Download file'}
                                size="small"
                                clickable
                                component="a"
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  mt: message.content ? 0.75 : 0,
                                  bgcolor: isMe ? 'rgba(255,255,255,0.18)' : 'grey.100',
                                  color: 'inherit',
                                  maxWidth: 220,
                                  '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }
                                }}
                              />
                            )
                          );
                        })()}
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'center', mt: 0.3, gap: 0.4, px: 0.5 }}>
                        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.disabled' }}>
                          {formatTime(message.createdAt)}
                        </Typography>
                        {isMe && (
                          <DoneAll sx={{ fontSize: 13, color: message.isRead ? '#29b6f6' : 'text.disabled' }} />
                        )}
                      </Box>
                    </Box>
                  </Box>
                </React.Fragment>
              );
            })}

            {typingUsers.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, mb: 0.5 }}>
                <Avatar
                  src={participant.avatarUrl || undefined}
                  sx={{ width: 28, height: 28, bgcolor: avatarColor(name), fontSize: 12, fontWeight: 700, flexShrink: 0 }}
                >
                  {name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ bgcolor: 'white', px: 1.5, py: 1, borderRadius: '18px 18px 18px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}>
                  <TypingDots />
                </Box>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      <MessageInput
        onSendMessage={onSendMessage}
        disabled={!participant}
        receiverId={participant?.id || participant?._id}
      />

      <Dialog open={!!imagePreview} onClose={() => setImagePreview(null)} maxWidth="md">
        <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
          <img
            src={imagePreview}
            alt="Preview"
            style={{ width: '100%', height: 'auto', maxHeight: '80vh', display: 'block', margin: '0 auto' }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Conversation;
