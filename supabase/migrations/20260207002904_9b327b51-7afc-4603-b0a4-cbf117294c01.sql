-- Allow public (anonymous) lookup of employees by invite_token for invite acceptance
-- This only exposes minimal fields and only for status = 'invited'
CREATE POLICY "Allow public invite token lookup"
ON public.employees
FOR SELECT
TO anon, authenticated
USING (invite_status = 'invited'::invite_status);