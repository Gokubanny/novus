/**
 * Authentication Service
 * Token lives in memory only — no localStorage.
 */

import { apiClient } from './apiClient';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'employee';
  lastLogin?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  employee?: {
    id: string;
    fullName: string;
    status: string;
  };
}

export interface InviteDetails {
  id: string;
  fullName: string;
  email: string;
  status: string;
}

export interface AcceptInviteResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  employee: {
    id: string;
    fullName: string;
    status: string;
  };
}

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    if (response.token) {
      apiClient.setToken(response.token);
    }
    return response;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {});
    } finally {
      apiClient.clearToken();
      // Wipe any legacy token left over from before this change
      localStorage.removeItem('authToken');
    }
  }

  async getCurrentUser(): Promise<AuthResponse> {
    return apiClient.get<AuthResponse>('/auth/me');
  }

  async getInviteDetails(token: string): Promise<InviteDetails> {
    return apiClient.get<InviteDetails>(`/invite/${token}`);
  }

  async acceptInvite(token: string, password: string): Promise<AcceptInviteResponse> {
    const response = await apiClient.post<AcceptInviteResponse>(
      `/invite/${token}/accept`,
      { password }
    );
    if (response.token) {
      apiClient.setToken(response.token);
    }
    return response;
  }

  isAuthenticated(): boolean {
    return !!apiClient.getToken();
  }

  getToken(): string | null {
    return apiClient.getToken();
  }
}

export const authService = new AuthService();