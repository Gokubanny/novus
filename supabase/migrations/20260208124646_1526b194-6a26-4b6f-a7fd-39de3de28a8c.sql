-- Add geocoding validation columns to verification_records
ALTER TABLE public.verification_records
ADD COLUMN expected_latitude double precision,
ADD COLUMN expected_longitude double precision,
ADD COLUMN distance_km double precision,
ADD COLUMN distance_flagged boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.verification_records.expected_latitude IS 'Latitude from geocoding the submitted address';
COMMENT ON COLUMN public.verification_records.expected_longitude IS 'Longitude from geocoding the submitted address';
COMMENT ON COLUMN public.verification_records.distance_km IS 'Distance in km between expected and actual GPS location';
COMMENT ON COLUMN public.verification_records.distance_flagged IS 'True if distance exceeds acceptable threshold';

-- Add distance threshold to company_settings
ALTER TABLE public.company_settings
ADD COLUMN distance_threshold_km double precision DEFAULT 1.0;

COMMENT ON COLUMN public.company_settings.distance_threshold_km IS 'Maximum allowed distance in km between submitted address and verified location';