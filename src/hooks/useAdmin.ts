/**
 * useAdmin Hook
 * Provides admin functionality for employee management and verification review
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminService,
  CreateEmployeeRequest,
  EmployeeData,
  ReviewVerificationRequest,
  DashboardStats,
  CompanySettings,
  UpdateSettingsRequest,
} from '@/services/adminService';

export const useAllEmployees = () => {
  return useQuery({
    queryKey: ['admin', 'employees'],
    queryFn: () => adminService.getAllEmployees(),
  });
};

export const useEmployeeById = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['admin', 'employee', employeeId],
    queryFn: () => adminService.getEmployeeById(employeeId!),
    enabled: !!employeeId,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeRequest) => adminService.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] });
    },
  });
};

export const useRequestReverification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (verificationId: string) => adminService.requestReverification(verificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'employee'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] });
    },
  });
};

export const useReviewVerification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      verificationId,
      data,
    }: {
      verificationId: string;
      data: ReviewVerificationRequest;
    }) => adminService.reviewVerification(verificationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'employee'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] });
    },
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: () => adminService.getDashboardStats(),
  });
};

export const useCompanySettings = () => {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminService.getSettings(),
  });
};

export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSettingsRequest }) =>
      adminService.updateSettings(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
  });
};