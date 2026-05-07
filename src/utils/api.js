import { getStoredToken } from './authSession';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://attendance-platform-backend.onrender.com/api/v1';

export const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export const authHeaders = (headers = {}) => {
  const token = getStoredToken();

  return token
    ? { ...headers, Authorization: `Bearer ${token}` }
    : headers;
};

export const parseJsonResponse = async (response) => {
  const responseText = await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    throw new Error('Invalid JSON response from server');
  }
};

export const apiRequest = async (path, options = {}) => {
  const { headers, auth = true, ...rest } = options;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...rest,
    headers: auth ? authHeaders(headers) : headers
  });
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
};

export const parseUnreadCount = (payload) => {
  const count =
    payload?.count ??
    payload?.data?.count ??
    payload?.unreadCount ??
    payload?.data?.unreadCount ??
    0;

  const parsed = Number(count);
  return Number.isFinite(parsed) ? parsed : 0;
};
