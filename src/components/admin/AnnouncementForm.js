import React, { useState, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  TextField,
  Typography
} from '@mui/material';
import {
  AttachFile,
  Campaign,
  Close,
  Description,
  Image,
  InsertDriveFile,
  Send,
  VideoFile
} from '@mui/icons-material';

const ACCEPTED = [
  'image/*',
  'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
  'video/webm', 'video/3gpp', 'video/ogg', 'video/x-ms-wmv',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'
].join(',');

const MAX_FILES = 5;
const MAX_BYTES = 100 * 1024 * 1024;

const humanSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileCategory = (file) => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'document';
};

const FileIcon = ({ category, sx }) => {
  if (category === 'image') return <Image sx={sx} />;
  if (category === 'video') return <VideoFile sx={sx} />;
  if (category === 'document') return <Description sx={sx} />;
  return <InsertDriveFile sx={sx} />;
};

const CATEGORY_COLORS = {
  image: { bg: '#e3f2fd', icon: '#1976d2' },
  video: { bg: '#f3e5f5', icon: '#7b1fa2' },
  document: { bg: '#e8f5e9', icon: '#2e7d32' }
};

const AnnouncementForm = () => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const picked = Array.from(event.target.files);
    event.target.value = '';
    setError('');

    const oversized = picked.filter((file) => file.size > MAX_BYTES);
    if (oversized.length) {
      setError(`${oversized.map((file) => file.name).join(', ')} exceed the 100 MB limit.`);
      return;
    }

    const remaining = MAX_FILES - attachments.length;
    if (picked.length > remaining) {
      setError(`You can attach at most ${MAX_FILES} files total. ${attachments.length} already added.`);
      return;
    }

    const newItems = picked.map((file) => {
      const category = fileCategory(file);
      const preview = category === 'image' ? URL.createObjectURL(file) : null;
      return { file, preview, category };
    });

    setAttachments((prev) => [...prev, ...newItems]);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => {
      const next = [...prev];
      if (next[index]?.preview) {
        URL.revokeObjectURL(next[index].preview);
      }
      next.splice(index, 1);
      return next;
    });
  };

  const sendAnnouncement = async () => {
    if ((!content.trim() && attachments.length === 0) || sending) {
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      attachments.forEach(({ file }) => formData.append('files', file));

      const token = (await import('../../utils/authSession')).getStoredToken();
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${apiBase}/messages/announcement`);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.onprogress = (progressEvent) => {
          if (progressEvent.lengthComputable) {
            setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
          }
        };

        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.message || parsed.error || `Server error ${xhr.status}`));
            }
          } catch {
            reject(new Error('Invalid response from server'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error. Check your connection and try again.'));
        xhr.ontimeout = () => reject(new Error('Request timed out. Try a smaller file or check your connection.'));
        xhr.timeout = 5 * 60 * 1000;
        xhr.send(formData);
      });

      setSuccess(`Announcement sent to ${data.announcements || 0} employee${data.announcements !== 1 ? 's' : ''}.`);
      setContent('');
      attachments.forEach((attachment) => attachment.preview && URL.revokeObjectURL(attachment.preview));
      setAttachments([]);
      setUploadProgress(0);
    } catch (err) {
      setError(err.message || 'Failed to send announcement. Please try again.');
      setUploadProgress(0);
    } finally {
      setSending(false);
    }
  };

  const canSend = (content.trim() || attachments.length > 0) && !sending;

  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: '#fff3e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Campaign sx={{ color: '#f57c00', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>Send Announcement</Typography>
            <Typography variant="caption" color="text.secondary">
              Broadcast to all employees in your company
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <TextField
          fullWidth
          multiline
          minRows={5}
          maxRows={20}
          placeholder="Write your announcement here... (supports long text)"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={sending}
          sx={{ mb: 2 }}
          inputProps={{ maxLength: 10000 }}
          helperText={content.length > 0 ? `${content.length.toLocaleString()} / 10,000 characters` : ''}
        />

        {attachments.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
            {attachments.map((attachment, index) => {
              const colors = CATEGORY_COLORS[attachment.category] || CATEGORY_COLORS.document;
              return (
                <Box
                  key={`${attachment.file.name}-${index}`}
                  sx={{
                    position: 'relative',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid #e0e0e0',
                    bgcolor: colors.bg,
                    width: attachment.preview ? 110 : 'auto',
                    flexShrink: 0
                  }}
                >
                  {attachment.preview ? (
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      style={{ width: 110, height: 80, objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, maxWidth: 220 }}>
                      <FileIcon category={attachment.category} sx={{ fontSize: 22, color: colors.icon, flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" fontWeight={600} noWrap display="block" sx={{ maxWidth: 160 }}>
                          {attachment.file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {humanSize(attachment.file.size)}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {attachment.preview && (
                    <Box sx={{ px: 0.75, py: 0.5, bgcolor: 'rgba(0,0,0,0.04)' }}>
                      <Typography variant="caption" noWrap display="block" sx={{ maxWidth: 100, fontSize: 10 }}>
                        {attachment.file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                        {humanSize(attachment.file.size)}
                      </Typography>
                    </Box>
                  )}

                  <IconButton
                    size="small"
                    onClick={() => removeAttachment(index)}
                    disabled={sending}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      bgcolor: 'rgba(0,0,0,0.45)',
                      color: 'white',
                      p: 0.25,
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                    }}
                  >
                    <Close sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>
              );
            })}
          </Box>
        )}

        {sending && uploadProgress > 0 && uploadProgress < 100 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Uploading...</Typography>
              <Typography variant="caption" color="text.secondary">{uploadProgress}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 1, height: 6 }} />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              multiple
              accept={ACCEPTED}
            />
            <Button
              variant="outlined"
              startIcon={<AttachFile />}
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || attachments.length >= MAX_FILES}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Attach Files
            </Button>
            {attachments.length > 0 && (
              <Chip
                label={`${attachments.length} / ${MAX_FILES}`}
                size="small"
                sx={{ bgcolor: '#f5f7fb', fontWeight: 600 }}
              />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Images, videos, documents · max 100 MB each
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <Send />}
            onClick={sendAnnouncement}
            disabled={!canSend}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              px: 3,
              background: 'linear-gradient(135deg,#f57c00,#ffa726)',
              boxShadow: '0 4px 12px rgba(245,124,0,0.35)',
              '&:hover': { background: 'linear-gradient(135deg,#e65100,#f57c00)' },
              '&.Mui-disabled': { background: '#e0e0e0' }
            }}
          >
            {sending ? 'Sending...' : 'Send Announcement'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AnnouncementForm;
