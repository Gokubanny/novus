/**
 * Employee Service — Version 2.0
 * Added: submitInspection() using postFormData for multipart uploads
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
  // V1 fields
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  landmark?: string;
  // V2 fields
  address_details?: {
    full_address: string;
    landmark?: string;
    city: string;
    lga?: string;
    state: string;
  } | null;
  verification_window_start?: string;
  verification_window_end?: string;
  status: 'pending_address' | 'pending_verification' | 'verified' | 'failed' | 'reverification_required';
  verified_at?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

// ── V1: Submit Address ────────────────────────────────────────────────────────
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

// ── V2: Submit Inspection ─────────────────────────────────────────────────────
export interface SubmitInspectionRequest {
  // Section A
  fullAddress: string;
  landmark?: string;
  city: string;
  lga?: string;
  state: string;
  // Section B
  buildingType: string;
  buildingPurpose: string;
  buildingStatus: string;
  buildingColour?: string;
  hasFence: boolean;
  hasGate: boolean;
  // Section C
  occupants: string;
  relationship?: string;
  notes?: string;
  // Window
  windowStart: string;
  windowEnd: string;
  // Images
  frontView: File;
  gateView?: File | null;
  streetView: File;
  additionalImages?: File[];
}

export interface SubmitInspectionResponse {
  id: string;
  status: string;
  verification_window_start: string;
  verification_window_end: string;
  images_uploaded: boolean;
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
  async getProfile(): Promise<EmployeeProfile> {
    return apiClient.get<EmployeeProfile>('/employee/profile');
  }

  async getVerificationStatus(): Promise<EmployeeVerificationStatus | null> {
    try {
      return await apiClient.get<EmployeeVerificationStatus | null>('/employee/verification-status');
    } catch (error) {
      console.error('Error fetching verification status:', error);
      return null;
    }
  }

  // ── V1: submitAddress — kept for backwards compatibility ───────────────────
  async submitAddress(data: SubmitAddressRequest): Promise<SubmitAddressResponse> {
    return apiClient.post<SubmitAddressResponse>('/employee/address', data);
  }

  // ── V2: submitInspection — full structured form with images ───────────────
  // Builds a FormData object from the typed request and sends it as
  // multipart/form-data using apiClient.postFormData().
  async submitInspection(data: SubmitInspectionRequest): Promise<SubmitInspectionResponse> {
    const formData = new FormData();

    // Section A — Address Details
    formData.append('fullAddress', data.fullAddress);
    formData.append('city', data.city);
    formData.append('state', data.state);
    if (data.landmark) formData.append('landmark', data.landmark);
    if (data.lga)      formData.append('lga', data.lga);

    // Section B — Property Details
    formData.append('buildingType',    data.buildingType);
    formData.append('buildingPurpose', data.buildingPurpose);
    formData.append('buildingStatus',  data.buildingStatus);
    // Booleans must be strings in FormData
    formData.append('hasFence', String(data.hasFence));
    formData.append('hasGate',  String(data.hasGate));
    if (data.buildingColour) formData.append('buildingColour', data.buildingColour);

    // Section C — Occupancy
    formData.append('occupants', data.occupants);
    if (data.relationship) formData.append('relationship', data.relationship);
    if (data.notes)        formData.append('notes', data.notes);

    // Verification Window
    formData.append('windowStart', data.windowStart);
    formData.append('windowEnd',   data.windowEnd);

    // Images — field names must match multer field config exactly
    formData.append('frontView',  data.frontView);
    formData.append('streetView', data.streetView);
    if (data.gateView) formData.append('gateView', data.gateView);
    if (data.additionalImages && data.additionalImages.length > 0) {
      data.additionalImages.forEach((file) => {
        formData.append('additionalImages', file);
      });
    }

    return apiClient.postFormData<SubmitInspectionResponse>('/employee/inspection', formData);
  }

  async verifyLocation(data: VerifyLocationRequest): Promise<VerifyLocationResponse> {
    return apiClient.post<VerifyLocationResponse>('/employee/verify-location', data);
  }

  async getVerificationHistory(): Promise<VerificationHistoryItem[]> {
    try {
      return await apiClient.get<VerificationHistoryItem[]>('/employee/history');
    } catch (error) {
      console.error('Error fetching verification history:', error);
      return [];
    }
  }
}

export const employeeService = new EmployeeService();