/**
 * API Client — Version 2.1
 *
 * Token is persisted in localStorage so login survives page reloads and
 * tab switches. It is cleared on explicit logout via authService.logout().
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://novus-backend-jqax.onrender.com/api';

const TOKEN_KEY = 'ng_auth_token'; // localStorage key

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  setToken(token: string | null): void {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private buildAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, { ...options });
      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
        }
        throw new ApiError(response.status, data.message || 'An error occurred', data.errors);
      }

      return data.data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof TypeError) {
        throw new ApiError(0, 'Network error. Please check your connection.');
      }
      throw new ApiError(500, 'An unexpected error occurred');
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers: this.buildHeaders() });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: this.buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      headers: this.buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers: this.buildHeaders() });
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: this.buildAuthHeaders(),
      body: formData,
    });
  }
}

export const apiClient = new ApiClient();