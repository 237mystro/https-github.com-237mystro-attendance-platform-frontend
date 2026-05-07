// src/components/messaging/MessageInput.js
import React, { useState, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Chip,
  Avatar,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Send,
  AttachFile,
  Image,
  Description,
  InsertDriveFile
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';

const MessageInput = ({ onSendMessage, disabled = false, receiverId }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const { socket, connected } = useSocket();

  // Handle file selection
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length + attachments.length > 5) {
      setError('Maximum 5 attachments allowed');
      return;
    }
    
    const newAttachments = files.map(file => {
      // Determine file type for icon
      let type = 'other';
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.includes('pdf') || file.type.includes('document')) {
        type = 'document';
      }
      
      return {
        file,
        filename: file.name,
        size: file.size,
        type
      };
    });
    
    setAttachments(prev => [...prev, ...newAttachments]);
    setError('');
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle send message
  const handleSendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || disabled || sending || !receiverId) {
      return;
    }

    try {
      setError('');
      setSending(true);
      
      await onSendMessage({
        content: message.trim(),
        attachments
      });
      
      // Clear input and attachments
      setMessage('');
      setAttachments([]);
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Send message error:', err);
    }
    
    setSending(false);
  };

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle typing indicator
  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    if (socket && connected && receiverId) {
      if (e.target.value) {
        socket.emit('typing:start', { receiverId });
      } else {
        socket.emit('typing:stop', { receiverId });
      }
    }
  };

  return (
    <Box sx={{ p: 1.5, borderTop: '1px solid #dde3ed', bgcolor: 'white' }}>
      {/* Error Alert */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {attachments.map((attachment, index) => (
            <Chip
              key={index}
              avatar={
                <Avatar>
                  {attachment.type === 'image' ? <Image /> : 
                   attachment.type === 'document' ? <Description /> : 
                   <InsertDriveFile />}
                </Avatar>
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', maxWidth: 150 }}>
                  <Typography variant="body2" noWrap>
                    {attachment.filename}
                  </Typography>
                </Box>
              }
              onDelete={() => removeAttachment(index)}
              size="small"
              sx={{ 
                mr: 0.5, 
                mb: 0.5,
                maxWidth: 200,
                '& .MuiChip-label': {
                  overflow: 'hidden'
                }
              }}
            />
          ))}
        </Box>
      )}
      
      {/* Message Input Area */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        />
        
        <IconButton 
          onClick={() => fileInputRef.current.click()}
          disabled={disabled || sending}
          sx={{ mb: 0.5 }}
        >
          <AttachFile />
        </IconButton>
        
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type a message…"
          value={message}
          onChange={handleTyping}
          onKeyDown={handleKeyPress}
          disabled={disabled || sending}
          sx={{ mx: 1 }}
          inputProps={{ maxLength: 2000 }}
          helperText={message.length > 1800 ? `${message.length} / 2,000` : ''}
          InputProps={{
            sx: { borderRadius: 3, bgcolor: '#f5f7fb', '& fieldset': { borderColor: '#dde3ed' } }
          }}
        />
        
        <IconButton
          onClick={handleSendMessage}
          disabled={(!message.trim() && attachments.length === 0) || disabled || sending || !receiverId}
          color="primary"
          sx={{ mb: 0.5 }}
        >
          {sending ? <CircularProgress size={24} /> : <Send />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default MessageInput;
