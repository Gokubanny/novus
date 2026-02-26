import React, { createContext, useContext, useState, useEffect } from 'react';
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
  // loading starts true so ProtectedRoute shows a spinner while we restore
  // the session — prevents a flash-redirect to /auth on every page reload.
  const [loading, setLoading] = useState(true);

  const userRole: UserRole = user?.role ?? null;
  const isAuthenticated = !!user;

  // ── Restore session on mount ──────────────────────────────────────────────
  // If a token exists in localStorage, call /auth/me to get the user object.
  // This is what makes login persist across page reloads.
  useEffect(() => {
    const restoreSession = async () => {
      const token = authService.getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await authService.getCurrentUser();
        // getCurrentUser returns the full auth response; the user is nested
        const restoredUser = (response as any).user ?? response;
        setUser(restoredUser as AuthUser);
      } catch (error) {
        // Token is expired or invalid — clear it so the user gets sent to login
        authService.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

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