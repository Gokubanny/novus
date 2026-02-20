/**
 * API Client — Version 2.0
 * Added: postFormData() for multipart/form-data requests (image upload)
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
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  // ── JSON headers ────────────────────────────────────────────────────────────
  private buildHeaders(contentType: string = 'application/json'): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': contentType,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // ── Auth-only headers (no Content-Type) ────────────────────────────────────
  // Used for FormData — browser must set Content-Type + boundary automatically.
  // Setting Content-Type manually breaks multipart boundary parsing.
  private buildAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, { ...options });
      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        throw new ApiError(
          response.status,
          data.message || 'An error occurred',
          data.errors
        );
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
    return this.request<T>(endpoint, {
      method: 'GET',
      headers: this.buildHeaders(),
    });
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
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers: this.buildHeaders(),
    });
  }

  // ── V2: FormData POST ───────────────────────────────────────────────────────
  // Used for the inspection endpoint which sends multipart/form-data.
  // DO NOT set Content-Type header — browser handles it with the correct boundary.
  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: this.buildAuthHeaders(),   // Auth only — no Content-Type
      body: formData,
    });
  }
}

export const apiClient = new ApiClient();