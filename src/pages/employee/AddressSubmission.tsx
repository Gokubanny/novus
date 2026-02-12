import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { useCurrentEmployee, useEmployeeVerification, useSubmitAddress } from '@/hooks/useEmployee';
import { useCompanySettings } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip: z.string().min(4, 'ZIP code is required'),
});

const AddressSubmission = () => {
  const navigate = useNavigate();
  const { data: employee, isLoading: employeeLoading } = useCurrentEmployee();
  const { data: verification, isLoading: verificationLoading } = useEmployeeVerification(employee?.id);
  const { data: settings, isLoading: settingsLoading } = useCompanySettings();
  const submitAddress = useSubmitAddress();

  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [landmark, setLandmark] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isLoading = employeeLoading || verificationLoading || settingsLoading;

  useEffect(() => {
    if (verification) {
      setStreet(verification.street || '');
      setCity(verification.city || '');
      setState(verification.state || '');
      setZip(verification.zip || '');
      setLandmark(verification.landmark || '');
      setWindowStart(verification.verification_window_start || '');
      setWindowEnd(verification.verification_window_end || '');
    } else if (settings) {
      setWindowStart(settings.default_window_start);
      setWindowEnd(settings.default_window_end);
    }
  }, [verification, settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    const result = addressSchema.safeParse({ street, city, state, zip });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    if (!windowStart || !windowEnd) {
      setError('Please select a verification window');
      return;
    }

    if (!employee) {
      setError('Employee not found');
      return;
    }

    try {
      await submitAddress.mutateAsync({
        employeeId: employee.id,
        street,
        city,
        state,
        zip,
        landmark: landmark || undefined,
        windowStart,
        windowEnd,
      });

      toast({
        title: 'Address saved!',
        description: 'You can now verify your location during your verification window.',
      });

      navigate('/employee');
    } catch (err: any) {
      setError(err.message || 'Failed to save address');
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // If already verified, show message
  if (verification?.status === 'verified') {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/employee')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardContent className="pt-6 text-center py-12">
            <MapPin className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Address Already Verified</h2>
            <p className="text-muted-foreground">
              Your address has been successfully verified. Contact your administrator if you need to update it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => navigate('/employee')} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {verification ? 'Update Your Address' : 'Submit Your Address'}
          </CardTitle>
          <CardDescription>
            Enter your residential address for verification. You'll confirm your location during the specified window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                placeholder="123 Main Street, Apt 4B"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                required
                disabled={submitAddress.isPending}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="New York"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  disabled={submitAddress.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="NY"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  disabled={submitAddress.isPending}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code *</Label>
                <Input
                  id="zip"
                  placeholder="10001"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  required
                  disabled={submitAddress.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landmark">Landmark (optional)</Label>
                <Input
                  id="landmark"
                  placeholder="Near Central Park"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  disabled={submitAddress.isPending}
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Verification Window</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select the time window when you'll confirm your location. This should be during night hours when you're at home.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="windowStart">Start Time *</Label>
                  <Input
                    id="windowStart"
                    type="time"
                    value={windowStart}
                    onChange={(e) => setWindowStart(e.target.value)}
                    required
                    disabled={submitAddress.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="windowEnd">End Time *</Label>
                  <Input
                    id="windowEnd"
                    type="time"
                    value={windowEnd}
                    onChange={(e) => setWindowEnd(e.target.value)}
                    required
                    disabled={submitAddress.isPending}
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={submitAddress.isPending}
            >
              {submitAddress.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  {verification ? 'Update Address' : 'Submit Address'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddressSubmission;
