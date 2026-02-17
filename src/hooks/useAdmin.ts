/**
 * useAdmin Hook
 * Provides admin functionality for employee management and verification review
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminService,
  CreateEmployeeRequest,
  ReviewVerificationRequest,
  UpdateSettingsRequest,
} from '@/services/adminService';

export const useAllEmployees = () => {
  return useQuery({
    queryKey: ['admin', 'employees'],
    queryFn: async () => {
      try {
        const data = await adminService.getAllEmployees();
        return data || [];
      } catch (error) {
        console.error('Error fetching employees:', error);
        return [];
      }
    },
    initialData: [],
  });
};

export const useEmployeeById = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['admin', 'employee', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      try {
        const data = await adminService.getEmployeeById(employeeId);
        return data || null;
      } catch (error) {
        console.error('Error fetching employee:', error);
        return null;
      }
    },
    enabled: !!employeeId,
    initialData: null,
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
    queryFn: async () => {
      try {
        const data = await adminService.getDashboardStats();
        return data || {
          totalEmployees: 0,
          invited: 0,
          verified: 0,
          pending: 0,
          failed: 0,
          reverificationRequired: 0
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
          totalEmployees: 0,
          invited: 0,
          verified: 0,
          pending: 0,
          failed: 0,
          reverificationRequired: 0
        };
      }
    },
    initialData: {
      totalEmployees: 0,
      invited: 0,
      verified: 0,
      pending: 0,
      failed: 0,
      reverificationRequired: 0
    },
  });
};

export const useCompanySettings = () => {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      try {
        const data = await adminService.getSettings();
        return data || null;
      } catch (error) {
        console.error('Error fetching settings:', error);
        return null;
      }
    },
    initialData: null,
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