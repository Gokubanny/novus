/**
 * API Client — Version 2.0
 * Token stored in memory only — never written to localStorage.
 * Token clears on page refresh, requiring re-login.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://novus-backend-jqax.onrender.com/api';

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
  // In-memory only — no localStorage, no sessionStorage
  private token: string | null = null;

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken(): void {
    this.token = null;
  }

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return headers;
  }

  private buildAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, { ...options });
      const data: ApiResponse<T> = await response.json();
      if (!response.ok) {
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

  // FormData POST — used for inspection image uploads
  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: this.buildAuthHeaders(),
      body: formData,
    });
  }
}

export const apiClient = new ApiClient();