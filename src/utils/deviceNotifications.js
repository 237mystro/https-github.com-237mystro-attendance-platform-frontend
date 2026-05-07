import { getStoredUser } from './authSession';

export const canUseNotifications = () =>
  typeof window !== 'undefined' && 'Notification' in window;

export const getNotificationPermission = () =>
  canUseNotifications() ? window.Notification.permission : 'unsupported';

export const requestNotificationPermission = async () => {
  if (!canUseNotifications()) {
    return 'unsupported';
  }

  return window.Notification.requestPermission();
};

export const showDeviceNotification = async ({ title, body, tag, url, icon }) => {
  if (!canUseNotifications() || window.Notification.permission !== 'granted') {
    return false;
  }

  const payload = {
    body,
    tag,
    data: { url: url || '/login' },
    icon: icon || '/logo192.png',
    badge: '/logo192.png'
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, payload);
        return true;
      }
    }

    const notification = new window.Notification(title, payload);
    notification.onclick = () => {
      window.focus();
      if (url) {
        window.location.href = url;
      }
      notification.close();
    };
    return true;
  } catch (error) {
    console.error('Device notification error:', error);
    return false;
  }
};

export const shouldNotifyUser = () => {
  const user = getStoredUser();
  return user?.notifications?.push !== false;
};
