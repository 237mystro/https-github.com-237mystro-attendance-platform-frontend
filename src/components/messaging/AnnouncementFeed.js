import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Avatar, Chip, CircularProgress, Alert, Dialog, DialogContent
} from '@mui/material';
import { Campaign, Description, Image, VolumeUp, VideoFile } from '@mui/icons-material';
import { apiRequest } from '../../utils/api';
import { useSocket } from '../../contexts/SocketContext';

const AVATAR_COLORS = ['#1976d2','#388e3c','#d32f2f','#f57c00','#7b1fa2','#0288d1','#c2185b','#00796b'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// Build a normalised file list from both the new `files` array and legacy single-file fields
const getFiles = (ann) => {
  if (ann.files && ann.files.length > 0) return ann.files;
  if (ann.fileUrl) return [{ url: ann.fileUrl, name: ann.fileName || 'Attachment', type: ann.fileType || 'other' }];
  return [];
};

const FileChip = ({ file }) => {
  const iconMap = {
    image: <Image sx={{ fontSize: 15 }} />,
    video: <VideoFile sx={{ fontSize: 15 }} />,
    document: <Description sx={{ fontSize: 15 }} />,
  };
  const icon = iconMap[file.type] || iconMap.document;

  return (
    <Chip
      clickable
      component="a"
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      icon={icon}
      label={file.name || 'View Attachment'}
      size="small"
      sx={{ bgcolor: '#f5f7fb', fontWeight: 500, maxWidth: 220, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }, '&:hover': { bgcolor: '#e8ecf3' } }}
    />
  );
};

const AnnouncementFeed = () => {
  const { fetchUnreadCount } = useSocket();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null); // { url, type }

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/messages/announcements');
      if (data.success) {
        setAnnouncements(data.announcements || []);
        fetchUnreadCount();
      } else {
        setError(data.message || 'Failed to fetch announcements');
      }
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fetchUnreadCount]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  useEffect(() => {
    const onNew = (event) => {
      const { announcement, sender } = event.detail || {};
      if (!announcement) return;
      const enriched = {
        ...announcement,
        sender: sender
          ? { _id: sender.id, name: sender.name, email: sender.email, role: sender.role }
          : announcement.sender,
      };
      setAnnouncements(prev =>
        prev.some(a => a._id === enriched._id) ? prev : [enriched, ...prev]
      );
    };
    window.addEventListener('newAnnouncementReceived', onNew);
    return () => window.removeEventListener('newAnnouncementReceived', onNew);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {announcements.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(245,124,0,0.1)', mx: 'auto', mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Campaign sx={{ fontSize: 40, color: '#f57c00' }} />
          </Box>
          <Typography variant="h6" fontWeight={600} color="text.secondary" gutterBottom>No Announcements Yet</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 280, mx: 'auto', lineHeight: 1.6 }}>
            Company-wide announcements from admins will appear here.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {announcements.map((ann, index) => {
            const files = getFiles(ann);
            const images = files.filter(f => f.type === 'image');
            const videos = files.filter(f => f.type === 'video');
            const docs   = files.filter(f => f.type !== 'image' && f.type !== 'video');

            return (
              <Box key={ann._id || index} sx={{
                bgcolor: 'white', borderRadius: 3, overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #ffe0b2',
                transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 6px 24px rgba(0,0,0,0.12)' }
              }}>
                {/* Amber top strip */}
                <Box sx={{ height: 4, background: 'linear-gradient(90deg,#f57c00,#ffa726)' }} />

                <Box sx={{ p: 2.5 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar src={ann.sender?.avatarUrl || undefined} sx={{ width: 40, height: 40, bgcolor: avatarColor(ann.sender?.name), fontWeight: 700, fontSize: 16 }}>
                      {ann.sender?.name?.charAt(0)?.toUpperCase() || 'A'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2" fontWeight={700}>{ann.sender?.name || 'Admin'}</Typography>
                        <Chip
                          icon={<VolumeUp sx={{ fontSize: '12px !important' }} />}
                          label="Announcement"
                          size="small"
                          sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 600, fontSize: 10, height: 20, '& .MuiChip-icon': { color: '#e65100' } }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                        {formatDate(ann.createdAt)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Text content */}
                  {ann.content && (
                    <Typography variant="body2" sx={{ lineHeight: 1.7, color: '#2d3748', whiteSpace: 'pre-wrap', mb: files.length > 0 ? 1.5 : 0 }}>
                      {ann.content}
                    </Typography>
                  )}

                  {/* Image grid */}
                  {images.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: (videos.length + docs.length) > 0 ? 1 : 0 }}>
                      {images.map((img, i) => (
                        <Box
                          key={i}
                          component="img"
                          src={img.url}
                          alt={img.name}
                          onClick={() => setLightbox({ url: img.url, type: 'image' })}
                          sx={{
                            width: images.length === 1 ? '100%' : 'calc(50% - 4px)',
                            maxHeight: 260, objectFit: 'cover',
                            borderRadius: 2, cursor: 'pointer',
                            border: '1px solid #e0e0e0',
                            transition: 'opacity 0.15s',
                            '&:hover': { opacity: 0.88 }
                          }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Video player */}
                  {videos.map((vid, i) => (
                    <Box key={i} sx={{ mb: 1, borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                      <video
                        controls
                        style={{ width: '100%', maxHeight: 320, display: 'block', background: '#000' }}
                        preload="metadata"
                      >
                        <source src={vid.url} />
                        Your browser does not support video playback.
                      </video>
                      <Box sx={{ px: 1.25, py: 0.75, bgcolor: '#f5f7fb' }}>
                        <Typography variant="caption" color="text.secondary">{vid.name}</Typography>
                      </Box>
                    </Box>
                  ))}

                  {/* Document chips */}
                  {docs.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {docs.map((doc, i) => <FileChip key={i} file={doc} />)}
                    </Box>
                  )}

                  {/* Footer */}
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #f5f5f5', display: 'flex', justifyContent: 'flex-end' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                      {new Date(ann.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Lightbox for images */}
      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg">
        <DialogContent sx={{ p: 0, bgcolor: 'black', display: 'flex', justifyContent: 'center' }}>
          {lightbox?.type === 'image' && (
            <img
              src={lightbox.url}
              alt="Preview"
              style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'block', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AnnouncementFeed;
