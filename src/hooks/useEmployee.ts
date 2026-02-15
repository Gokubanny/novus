/**
 * useEmployee Hook
 * Provides employee functionality for address submission and location verification
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  employeeService,
  SubmitAddressRequest,
  VerifyLocationRequest,
} from '@/services/employeeService';

export const useCurrentEmployee = () => {
  return useQuery({
    queryKey: ['employee', 'profile'],
    queryFn: () => employeeService.getProfile(),
  });
};

export const useEmployeeVerification = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['employee', 'verification', employeeId],
    queryFn: () => employeeService.getVerificationStatus(),
    enabled: !!employeeId,
  });
};

export const useSubmitAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitAddressRequest) => employeeService.submitAddress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'verification'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'profile'] });
    },
  });
};

export const useVerifyLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VerifyLocationRequest) => employeeService.verifyLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'verification'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['employee', 'history'] });
    },
  });
};

export const useVerificationHistory = () => {
  return useQuery({
    queryKey: ['employee', 'history'],
    queryFn: () => employeeService.getVerificationHistory(),
  });
};