/**
 * useAuth Hook
 * Manages authentication state and operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService, LoginCredentials, AuthUser } from '@/services/authService';
import { useCallback, useState, useEffect } from 'react';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null);

  // Query for current user
  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getCurrentUser().then(r => r.user),
    enabled: !!authService.getToken(),
    retry: false,
  });

  // Mutation for login
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      setIsAuthenticated(true);
      setUserRole(data.user.role);
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
    onError: () => {
      setIsAuthenticated(false);
      setUserRole(null);
    },
  });

  // Mutation for logout
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      setIsAuthenticated(false);
      setUserRole(null);
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.clear();
    },
  });

  // Update auth state when user data changes
  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
      setUserRole(user.role);
    } else if (!userLoading && authService.getToken()) {
      // Token exists but user query failed
      setIsAuthenticated(false);
      setUserRole(null);
    }
  }, [user, userLoading]);

  const login = useCallback(
    async (email: string, password: string) => {
      return loginMutation.mutateAsync({ email, password });
    },
    [loginMutation]
  );

  const logout = useCallback(
    async () => {
      return logoutMutation.mutateAsync();
    },
    [logoutMutation]
  );

  return {
    user: user || null,
    userRole,
    isAuthenticated,
    loading: userLoading || loginMutation.isPending || logoutMutation.isPending,
    error: userError || loginMutation.error || logoutMutation.error,
    login,
    logout,
    loginMutation,
    logoutMutation,
  };
};

export const useLoginForm = () => {
  const { login, loginMutation } = useAuth();

  const signIn = useCallback(
    (email: string, password: string) => {
      return login(email, password);
    },
    [login]
  );

  return {
    signIn,
    isLoading: loginMutation.isPending,
    error: loginMutation.error?.message,
  };
};

export const useLogout = () => {
  const { logout, logoutMutation } = useAuth();

  return {
    logout,
    isLoading: logoutMutation.isPending,
  };
};