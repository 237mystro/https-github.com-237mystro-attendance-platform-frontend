const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const getStoredToken = () => sessionStorage.getItem(TOKEN_KEY);

export const clearSession = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

export const getStoredUser = () => {
  const user = sessionStorage.getItem(USER_KEY);
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch (error) {
    clearSession();
    return null;
  }
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  const [, payload] = token.split('.');
  if (!payload) return false;
  try {
    const decoded = JSON.parse(window.atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.exp ? decoded.exp * 1000 <= Date.now() : false;
  } catch (error) {
    return false;
  }
};

export const getSession = () => {
  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || !user || isTokenExpired(token)) {
    clearSession();
    return null;
  }
  return { token, user };
};

export const storeSession = (token, user) => {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};
