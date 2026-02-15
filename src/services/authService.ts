/**
 * Authentication Service
 * Handles login, logout, and user session management
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

export interface AcceptInviteRequest {
  password: string;
}

export class AuthService {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    
    // Store token
    if (response.token) {
      apiClient.setToken(response.token);
    }
    
    return response;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {});
    } finally {
      apiClient.setToken(null);
    }
  }

  /**
   * Get current logged-in user
   */
  async getCurrentUser(): Promise<AuthResponse> {
    return apiClient.get<AuthResponse>('/auth/me');
  }

  /**
   * Get invite details by token
   */
  async getInviteDetails(token: string): Promise<InviteDetails> {
    return apiClient.get<InviteDetails>(`/invite/${token}`);
  }

  /**
   * Accept invite and create account
   */
  async acceptInvite(token: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      `/invite/${token}/accept`,
      { password }
    );
    
    // Store token
    if (response.token) {
      apiClient.setToken(response.token);
    }
    
    return response;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!apiClient.getToken();
  }

  /**
   * Get the current token
   */
  getToken(): string | null {
    return apiClient.getToken();
  }
}

// Export singleton instance
export const authService = new AuthService(); 