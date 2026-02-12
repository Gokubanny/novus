import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { geocodeAddress, calculateDistanceKm } from '@/lib/geocoding';
import type { Database } from '@/integrations/supabase/types';

type Employee = Database['public']['Tables']['employees']['Row'];
type VerificationRecord = Database['public']['Tables']['verification_records']['Row'];

export const useCurrentEmployee = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-employee', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Employee | null;
    },
    enabled: !!user,
  });
};

export const useEmployeeVerification = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['verification-record', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      
      const { data, error } = await supabase
        .from('verification_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as VerificationRecord | null;
    },
    enabled: !!employeeId,
  });
};

export const useSubmitAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      street,
      city,
      state,
      zip,
      landmark,
      windowStart,
      windowEnd,
    }: {
      employeeId: string;
      street: string;
      city: string;
      state: string;
      zip: string;
      landmark?: string;
      windowStart: string;
      windowEnd: string;
    }) => {
      // Geocode the address to get expected coordinates
      const geocodeResult = await geocodeAddress(street, city, state, zip);
      
      // Check if a record already exists
      const { data: existing } = await supabase
        .from('verification_records')
        .select('id')
        .eq('employee_id', employeeId)
        .maybeSingle();

      const recordData = {
        street,
        city,
        state,
        zip,
        landmark,
        verification_window_start: windowStart,
        verification_window_end: windowEnd,
        status: 'pending_verification' as const,
        expected_latitude: geocodeResult.latitude,
        expected_longitude: geocodeResult.longitude,
        // Reset distance fields when address changes
        distance_km: null,
        distance_flagged: false,
      };

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('verification_records')
          .update(recordData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return { ...data, geocodeResult };
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('verification_records')
          .insert({
            employee_id: employeeId,
            ...recordData,
          })
          .select()
          .single();

        if (error) throw error;
        return { ...data, geocodeResult };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-record'] });
    },
  });
};

export const useVerifyLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
      latitude,
      longitude,
      distanceThresholdKm = 1.0,
    }: {
      recordId: string;
      latitude: number;
      longitude: number;
      distanceThresholdKm?: number;
    }) => {
      // First get the existing record to get expected coordinates
      const { data: existingRecord, error: fetchError } = await supabase
        .from('verification_records')
        .select('expected_latitude, expected_longitude')
        .eq('id', recordId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate distance if we have expected coordinates
      let distanceKm: number | null = null;
      let distanceFlagged = false;

      if (existingRecord?.expected_latitude && existingRecord?.expected_longitude) {
        distanceKm = calculateDistanceKm(
          existingRecord.expected_latitude,
          existingRecord.expected_longitude,
          latitude,
          longitude
        );
        distanceFlagged = distanceKm > distanceThresholdKm;
      }

      const { data, error } = await supabase
        .from('verification_records')
        .update({
          latitude,
          longitude,
          verified_at: new Date().toISOString(),
          status: 'verified',
          distance_km: distanceKm,
          distance_flagged: distanceFlagged,
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, distanceKm, distanceFlagged };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-record'] });
    },
  });
};
