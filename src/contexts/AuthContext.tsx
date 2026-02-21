import React, { createContext, useContext, useState } from 'react';
import { authService, AuthUser } from '@/services/authService';
import { ApiError } from '@/services/apiClient';

type UserRole = 'admin' | 'employee' | null;

interface AuthContextType {
  user: AuthUser | null;
  userRole: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  // No localStorage means no async restore on mount — loading starts false.
  // The user must log in fresh each session.
  const [loading, setLoading] = useState(false);

  const userRole: UserRole = user?.role ?? null;
  const isAuthenticated = !!user;

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      return { error: null };
    } catch (error) {
      if (error instanceof ApiError) {
        return { error: error.message };
      }
      return { error: 'Unexpected error occurred' };
    } finally {
      setLoading(false);
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
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};