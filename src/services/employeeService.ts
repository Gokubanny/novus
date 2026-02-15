/**
 * Employee Service
 * Handles employee operations: profile, address submission, location verification
 */

import { apiClient } from './apiClient';

export interface EmployeeProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  status: string;
  created_at: string;
}

export interface EmployeeVerificationStatus {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export interface SubmitAddressRequest {
  street: string;
  city: string;
  state: string;
  zip: string;
  landmark?: string;
  windowStart: string;
  windowEnd: string;
}

export interface SubmitAddressResponse {
  id: string;
  status: string;
  verification_window_start: string;
  verification_window_end: string;
}

export interface VerifyLocationRequest {
  latitude: number;
  longitude: number;
  distanceThresholdKm?: number;
}

export interface VerifyLocationResponse {
  id: string;
  status: string;
  verified_at: string;
  distance_km?: number;
  distance_flagged: boolean;
}

export interface VerificationHistoryItem {
  id: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  status: string;
  verified_at?: string;
  created_at: string;
}

export class EmployeeService {
  /**
   * Get current employee's profile
   */
  async getProfile(): Promise<EmployeeProfile> {
    return apiClient.get<EmployeeProfile>('/employee/profile');
  }

  /**
   * Get current verification status
   */
  async getVerificationStatus(): Promise<EmployeeVerificationStatus | null> {
    const response = await apiClient.get<EmployeeVerificationStatus | null>(
      '/employee/verification-status'
    );
    return response;
  }

  /**
   * Submit or update residential address
   */
  async submitAddress(data: SubmitAddressRequest): Promise<SubmitAddressResponse> {
    return apiClient.post<SubmitAddressResponse>('/employee/address', data);
  }

  /**
   * Verify location during verification window
   */
  async verifyLocation(data: VerifyLocationRequest): Promise<VerifyLocationResponse> {
    return apiClient.post<VerifyLocationResponse>('/employee/verify-location', data);
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(): Promise<VerificationHistoryItem[]> {
    return apiClient.get<VerificationHistoryItem[]>('/employee/history');
  }
}

// Export singleton instance
export const employeeService = new EmployeeService();