import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Employee = Database['public']['Tables']['employees']['Row'];
type VerificationRecord = Database['public']['Tables']['verification_records']['Row'];
type CompanySettings = Database['public']['Tables']['company_settings']['Row'];

export interface EmployeeWithVerification extends Employee {
  verification_records: VerificationRecord[];
}

export const useAllEmployees = () => {
  return useQuery({
    queryKey: ['all-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          verification_records (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmployeeWithVerification[];
    },
  });
};

export const useEmployeeById = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          verification_records (*)
        `)
        .eq('id', employeeId)
        .single();

      if (error) throw error;
      return data as EmployeeWithVerification;
    },
    enabled: !!employeeId,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fullName,
      email,
      phone,
    }: {
      fullName: string;
      email: string;
      phone?: string;
    }) => {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          full_name: fullName,
          email,
          phone,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
};

export const useRequestReverification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      const { data, error } = await supabase
        .from('verification_records')
        .update({
          status: 'reverification_required',
          verified_at: null,
          latitude: null,
          longitude: null,
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
};

export const useCompanySettings = () => {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as CompanySettings;
    },
  });
};

export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      companyName,
      defaultWindowStart,
      defaultWindowEnd,
      distanceThresholdKm,
    }: {
      id: string;
      companyName: string;
      defaultWindowStart: string;
      defaultWindowEnd: string;
      distanceThresholdKm?: number;
    }) => {
      const updateData: Record<string, any> = {
        company_name: companyName,
        default_window_start: defaultWindowStart,
        default_window_end: defaultWindowEnd,
      };
      
      if (distanceThresholdKm !== undefined) {
        updateData.distance_threshold_km = distanceThresholdKm;
      }

      const { data, error } = await supabase
        .from('company_settings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    },
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, invite_status');

      if (empError) throw empError;

      const { data: records, error: recError } = await supabase
        .from('verification_records')
        .select('status');

      if (recError) throw recError;

      const totalEmployees = employees?.length || 0;
      const invited = employees?.filter(e => e.invite_status === 'invited').length || 0;
      const verified = records?.filter(r => r.status === 'verified').length || 0;
      const pending = records?.filter(r => r.status === 'pending_verification' || r.status === 'pending_address').length || 0;
      const failed = records?.filter(r => r.status === 'failed').length || 0;
      const reverificationRequired = records?.filter(r => r.status === 'reverification_required').length || 0;

      return {
        totalEmployees,
        invited,
        verified,
        pending,
        failed,
        reverificationRequired,
      };
    },
  });
};
