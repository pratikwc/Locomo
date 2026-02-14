"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled' | 'pending';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phoneNumber: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  sendOTP: (phoneNumber: string) => Promise<void>;
  error: string | null;
  hasGoogleAccount: boolean | null;
  checkGoogleConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasGoogleAccount, setHasGoogleAccount] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        if (data.user) {
          await checkGoogleConnection();
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const response = await fetch('/api/google/check-connection');
      if (response.ok) {
        const data = await response.json();
        setHasGoogleAccount(data.connected);
      }
    } catch (err) {
      console.error('Google connection check error:', err);
      setHasGoogleAccount(false);
    }
  };

  const sendOTP = async (phoneNumber: string) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const login = async (phoneNumber: string, otpCode: string) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      setUser(data.user);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, sendOTP, error, hasGoogleAccount, checkGoogleConnection }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
