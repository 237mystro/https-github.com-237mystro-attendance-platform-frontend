// src/contexts/SocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { apiRequest, parseUnreadCount, SOCKET_URL } from '../utils/api';
import { getStoredToken } from '../utils/authSession';
import { shouldNotifyUser, showDeviceNotification } from '../utils/deviceNotifications';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser } = useAuth();
  const messagingUrl = currentUser?.role === 'employee'
    ? '/employee/messaging'
    : currentUser?.role === 'branch_manager' || currentUser?.role === 'branch_hr'
      ? '/branch/messaging'
      : '/admin/messaging';

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !currentUser) {
      setSocket(null);
      setConnected(false);
      return undefined;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('authenticate', token);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    // Handle incoming messages
    newSocket.on('message:receive', (data) => {
      setUnreadCount((prev) => prev + 1);
      if (shouldNotifyUser()) {
        const senderName = data?.sender?.name || data?.message?.sender?.name || 'New message';
        showDeviceNotification({
          title: senderName,
          body: data?.message?.content || 'You received a new message.',
          tag: `message-${data?.message?._id || Date.now()}`,
          url: messagingUrl
        });
      }
      window.dispatchEvent(new CustomEvent('newMessageReceived', { detail: data }));
    });

    // Handle incoming announcements
    newSocket.on('announcement:receive', (data) => {
      setUnreadCount((prev) => prev + 1);
      if (shouldNotifyUser()) {
        showDeviceNotification({
          title: 'New announcement',
          body: data?.announcement?.content || `${data?.sender?.name || 'Management'} shared an announcement.`,
          tag: `announcement-${data?.announcement?._id || Date.now()}`,
          url: messagingUrl
        });
      }
      window.dispatchEvent(new CustomEvent('newAnnouncementReceived', { detail: data }));
    });

    // Handle typing indicators
    newSocket.on('typing:start', (data) => {
      window.dispatchEvent(new CustomEvent('userTypingStart', { detail: data }));
    });

    newSocket.on('typing:stop', (data) => {
      window.dispatchEvent(new CustomEvent('userTypingStop', { detail: data }));
    });

    // Handle user online/offline status
    newSocket.on('user:online', (data) => {
      window.dispatchEvent(new CustomEvent('userOnline', { detail: data }));
    });

    // Shift reminder (30 min before shift)
    newSocket.on('shift:reminder', (data) => {
      window.dispatchEvent(new CustomEvent('shiftReminder', { detail: data }));
    });

    // Shift transfer events
    newSocket.on('transfer:incoming', (data) => {
      window.dispatchEvent(new CustomEvent('transferIncoming', { detail: data }));
    });

    newSocket.on('transfer:accepted', (data) => {
      window.dispatchEvent(new CustomEvent('transferAccepted', { detail: data }));
    });

    newSocket.on('transfer:declined', (data) => {
      window.dispatchEvent(new CustomEvent('transferDeclined', { detail: data }));
    });

    // Shift assignment events
    newSocket.on('shift:assigned', (data) => {
      window.dispatchEvent(new CustomEvent('shiftAssigned', { detail: data }));
    });

    newSocket.on('shift:response', (data) => {
      window.dispatchEvent(new CustomEvent('shiftResponse', { detail: data }));
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [currentUser, messagingUrl]);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const data = await apiRequest('/messages/unread-count');
      if (data.success) {
        setUnreadCount(parseUnreadCount(data));
      }
    } catch (err) {
      console.error('Fetch unread count error:', err);
    }
  };

  useEffect(() => {
    if (connected) {
      fetchUnreadCount();
      
      // Poll for unread count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [connected]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined;
    }

    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === 'notification-click' && event.data.url) {
        window.location.href = event.data.url;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const value = {
    socket,
    connected,
    unreadCount,
    setUnreadCount,
    fetchUnreadCount
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
