import React, { useContext, useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { clearSession, getSession, storeSession } from '../utils/authSession';

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const session = getSession();
    setCurrentUser(session?.user || null);
    setLoading(false);
  }, []);

  const setSession = (token, user) => {
    storeSession(token, user);
    setCurrentUser(user);
  };

  async function signup(email, password, name, company, role = 'admin') {
    const data = await apiRequest('/auth/register-business', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      auth: false,
      body: JSON.stringify({ email, password, name, company, role })
    });

    setSession(data.token, data.user);
    return data;
  }

  async function login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      auth: false,
      body: JSON.stringify({ email, password })
    });

    setSession(data.token, data.user);
    return data;
  }

  async function onboardEmployee(email, name, phone, momoNumber, position) {
    const data = await apiRequest('/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, name, phone, momoNumber, position })
    });

    return data;
  }

  function logout() {
    clearSession();
    setCurrentUser(null);
    return Promise.resolve();
  }

  const value = {
    currentUser,
    setSession,
    login,
    signup,
    logout,
    onboardEmployee
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
