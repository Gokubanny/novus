/**
 * Admin Service
 * Handles admin operations: employee management, verification review, settings
 */

import { apiClient } from './apiClient';

export interface CreateEmployeeRequest {
  fullName: string;
  email: string;
  phone?: string;
}

export interface EmployeeData {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  invite_status: 'invited' | 'accepted';
  invite_token: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  verification_records: VerificationRecord[];
}

export interface VerificationRecord {
  id: string;
  employee_id: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  landmark?: string;
  verification_window_start?: string;
  verification_window_end?: string;
  status: 'pending_address' | 'pending_verification' | 'verified' | 'failed' | 'reverification_required';
  verified_at?: string;
  latitude?: number;
  longitude?: number;
  expected_latitude?: number;
  expected_longitude?: number;
  distance_km?: number;
  distance_flagged?: boolean;
  review_status?: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeResponse {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  status: string;
  inviteToken: string;
  inviteLink: string;
  createdAt: string;
}

export interface ReviewVerificationRequest {
  reviewStatus: 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
}

export interface DashboardStats {
  totalEmployees: number;
  invited: number;
  verified: number;
  pending: number;
  failed: number;
  reverificationRequired: number;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  default_window_start: string;
  default_window_end: string;
  distance_threshold_km: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateSettingsRequest {
  companyName?: string;
  defaultWindowStart?: string;
  defaultWindowEnd?: string;
  distanceThresholdKm?: number;
}

export class AdminService {
  /**
   * Create a new employee
   */
  async createEmployee(data: CreateEmployeeRequest): Promise<CreateEmployeeResponse> {
    return apiClient.post<CreateEmployeeResponse>('/admin/employees', data);
  }

  /**
   * Get all employees with their verifications
   */
  async getAllEmployees(): Promise<EmployeeData[]> {
    const response = await apiClient.get<EmployeeData[]>('/admin/employees');
    return response;
  }

  /**
   * Get employee by ID with verification details
   */
  async getEmployeeById(id: string): Promise<EmployeeData> {
    return apiClient.get<EmployeeData>(`/admin/employees/${id}`);
  }

  /**
   * Request re-verification for an employee
   */
  async requestReverification(verificationId: string): Promise<{ id: string; status: string }> {
    return apiClient.post(`/admin/employees/${verificationId}/reverify`, {});
  }

  /**
   * Review a verification (approve or reject)
   */
  async reviewVerification(
    verificationId: string,
    data: ReviewVerificationRequest
  ): Promise<{
    id: string;
    reviewStatus: string;
    reviewNotes?: string;
    reviewedAt: string;
  }> {
    return apiClient.post(`/admin/verifications/${verificationId}/review`, data);
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>('/admin/dashboard/stats');
  }

  /**
   * Get company settings
   */
  async getSettings(): Promise<CompanySettings> {
    return apiClient.get<CompanySettings>('/admin/settings');
  }

  /**
   * Update company settings
   */
  async updateSettings(id: string, data: UpdateSettingsRequest): Promise<CompanySettings> {
    return apiClient.put<CompanySettings>(`/admin/settings/${id}`, data);
  }
}

// Export singleton instance
export const adminService = new AdminService();