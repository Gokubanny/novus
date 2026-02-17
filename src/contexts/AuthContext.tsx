import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthUser } from '@/services/authService';
import { ApiError } from '@/services/apiClient';

type UserRole = 'admin' | 'employee' | null;

interface AuthContextType {
  user: AuthUser | null;
  userRole: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole: UserRole = user?.role ?? null;
  const isAuthenticated = authService.isAuthenticated();

  const refreshUser = async () => {
    if (!authService.isAuthenticated()) {
      setLoading(false);
      return;
    }

    try {
      const response = await authService.getCurrentUser();
      setUser(response.user);
    } catch (error) {
      authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      return { error: null };
    } catch (error) {
      if (error instanceof ApiError) {
        return { error: error.message };
      }
      return { error: 'Unexpected error occurred' };
    }
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        signIn,
        signOut,
        refreshUser,
        isAuthenticated
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};