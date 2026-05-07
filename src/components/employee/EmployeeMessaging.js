// src/components/employee/EmployeeMessaging.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  TextField,
  IconButton,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import {
  Send,
  AttachFile,
  Image,
  Description,
  CheckCircle
} from '@mui/icons-material';
import { apiRequest } from '../../utils/api';
import { getStoredUser } from '../../utils/authSession';

const EmployeeMessaging = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await apiRequest('/messages');
      
      if (data.success) {
        setMessages(data.messages);
      } else {
        setError(data.message || 'Failed to fetch messages');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Fetch messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchMessages();
    
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle file selection
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachments(prev => [
          ...prev,
          {
            file,
            filename: file.name,
            url: e.target.result,
            size: file.size,
            type: file.type.startsWith('image/') ? 'image' : 'document'
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || sending) {
      return;
    }

    try {
      setError('');
      setSending(true);
      
      const data = await apiRequest('/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          attachments: attachments
        })
      });
      
      if (data.success) {
        setNewMessage('');
        setAttachments([]);
        fetchMessages(); // Refresh messages
      } else {
        setError(data.message || 'Failed to send message');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Send message error:', err);
    }
    
    setSending(false);
  };

  // Format time
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6">Messages with Admin</Typography>
        </Box>
        
        {/* Messages Area */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: 'grey.50' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <List>
            {messages.map((message, index) => {
              const user = getStoredUser() || {};
              const currentUserId = user.id || user._id;
              const senderId = message.sender?._id || message.sender?.id || message.sender;
              const isCurrentUser = senderId === currentUserId;
              const showDate = index === 0 || 
                new Date(messages[index-1].createdAt).toDateString() !== 
                new Date(message.createdAt).toDateString();
              
              return (
                <React.Fragment key={message._id}>
                  {showDate && (
                    <Box sx={{ textAlign: 'center', my: 2 }}>
                      <Chip label={formatDate(message.createdAt)} size="small" variant="outlined" />
                    </Box>
                  )}
                  
                  <ListItem sx={{ 
                    justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                    py: 0.5
                  }}>
                    <Box sx={{ 
                      maxWidth: '70%',
                      bgcolor: isCurrentUser ? 'primary.main' : 'white',
                      color: isCurrentUser ? 'white' : 'text.primary',
                      borderRadius: 2,
                      p: 1.5,
                      boxShadow: 1
                    }}>
                      {message.content && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {message.content}
                        </Typography>
                      )}
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                          {message.attachments.map((attachment, idx) => (
                            <Chip
                              key={idx}
                              icon={
                                attachment.type === 'image' ? <Image /> : 
                                attachment.type === 'document' ? <Description /> : 
                                <AttachFile />
                              }
                              label={attachment.filename}
                              size="small"
                              sx={{ 
                                mr: 0.5, 
                                mb: 0.5,
                                bgcolor: isCurrentUser ? 'primary.dark' : 'grey.200',
                                color: isCurrentUser ? 'white' : 'text.primary',
                                '& .MuiChip-icon': {
                                  color: isCurrentUser ? 'white' : 'inherit'
                                }
                              }}
                            />
                          ))}
                        </Box>
                      )}
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        alignItems: 'center',
                        mt: 0.5
                      }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: isCurrentUser ? 'rgba(255,255,255,0.7)' : 'text.secondary'
                          }}
                        >
                          {formatTime(message.createdAt)}
                        </Typography>
                        {isCurrentUser && message.isRead && (
                          <CheckCircle 
                            sx={{ 
                              fontSize: 14, 
                              ml: 0.5, 
                              color: 'rgba(255,255,255,0.7)' 
                            }} 
                          />
                        )}
                      </Box>
                    </Box>
                  </ListItem>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </List>
        </Box>
        
        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <Box sx={{ p: 1, bgcolor: 'grey.100' }}>
            {attachments.map((attachment, index) => (
              <Chip
                key={index}
                label={attachment.filename}
                onDelete={() => removeAttachment(index)}
                size="small"
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
          </Box>
        )}
        
        {/* Input Area */}
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              multiple
              accept="image/*,.pdf,.doc,.docx"
            />
            
            <IconButton onClick={() => fileInputRef.current.click()}>
              <AttachFile />
            </IconButton>
            
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              sx={{ mx: 1 }}
            />
            
            <IconButton
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && attachments.length === 0) || sending}
              color="primary"
            >
              {sending ? <CircularProgress size={24} /> : <Send />}
            </IconButton>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default EmployeeMessaging;
