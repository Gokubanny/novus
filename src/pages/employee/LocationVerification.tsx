import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Loader2, 
  MapPin, 
  CheckCircle, 
  AlertTriangle,
  Shield,
  Clock
} from 'lucide-react';
import { useCurrentEmployee, useEmployeeVerification, useVerifyLocation } from '@/hooks/useEmployee';
import { useCompanySettings } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

const LocationVerification = () => {
  const navigate = useNavigate();
  const { data: employee, isLoading: employeeLoading } = useCurrentEmployee();
  const { data: verification, isLoading: verificationLoading } = useEmployeeVerification(employee?.id);
  const { data: settings, isLoading: settingsLoading } = useCompanySettings();
  const verifyLocation = useVerifyLocation();

  const [consent, setConsent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isLoading = employeeLoading || verificationLoading || settingsLoading;
  const distanceThreshold = (settings as any)?.distance_threshold_km ?? 1.0;

  const canVerifyNow = () => {
    if (!verification) return false;
    if (verification.status !== 'pending_verification' && verification.status !== 'reverification_required') return false;
    if (!verification.verification_window_start || !verification.verification_window_end) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = verification.verification_window_start;
    const end = verification.verification_window_end;

    // Handle overnight windows
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    return currentTime >= start && currentTime <= end;
  };

  const isInWindow = canVerifyNow();

  const handleVerify = async () => {
    if (!consent) {
      setError('Please accept the consent to continue');
      return;
    }

    if (!verification) {
      setError('Verification record not found');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Submit verification with distance calculation
      const result = await verifyLocation.mutateAsync({
        recordId: verification.id,
        latitude,
        longitude,
        distanceThresholdKm: distanceThreshold,
      });

      // Show appropriate toast based on distance
      if (result.distanceFlagged) {
        toast({
          title: 'Location Verified with Warning',
          description: `Your location was ${result.distanceKm?.toFixed(1)}km from your submitted address. This has been flagged for review.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Location Verified!',
          description: 'Your address has been successfully verified.',
        });
      }

      setSuccess(true);

      // Redirect after success
      setTimeout(() => {
        navigate('/employee');
      }, 2000);

    } catch (err: any) {
      if (err.code === 1) {
        setError('Location access denied. Please enable location permissions in your browser and try again.');
      } else if (err.code === 2) {
        setError('Could not determine your location. Please ensure GPS is enabled and try again.');
      } else if (err.code === 3) {
        setError('Location request timed out. Please try again.');
      } else {
        setError(err.message || 'Failed to verify location');
      }
    } finally {
      setVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already verified
  if (verification?.status === 'verified') {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/employee')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-success/30">
          <CardContent className="pt-6 text-center py-12">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Already Verified</h2>
            <p className="text-muted-foreground">
              Your location has already been verified. No further action is needed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not in verification window
  if (!isInWindow && !success) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/employee')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-warning/30">
          <CardContent className="pt-6 text-center py-12">
            <Clock className="h-16 w-16 text-warning mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Outside Verification Window</h2>
            <p className="text-muted-foreground mb-4">
              You can only verify your location during your scheduled window.
            </p>
            {verification?.verification_window_start && verification?.verification_window_end && (
              <p className="text-lg font-semibold">
                Your window: {verification.verification_window_start} - {verification.verification_window_end}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="border-success/30">
          <CardContent className="pt-6 text-center py-12">
            <CheckCircle className="h-20 w-20 text-success mx-auto mb-4 animate-scale-in" />
            <h2 className="text-2xl font-bold text-success mb-2">Verification Successful!</h2>
            <p className="text-muted-foreground mb-4">
              Your location has been captured and your address is now verified.
            </p>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Redirecting to dashboard...</p>
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
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Confirm Your Location</CardTitle>
          <CardDescription>
            Verify that you're at your registered residential address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Address being verified */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Verifying address:</p>
            <p className="font-medium">
              {verification?.street}
              {verification?.city && `, ${verification.city}`}
              {verification?.state && `, ${verification.state}`}
              {verification?.zip && ` ${verification.zip}`}
            </p>
          </div>

          {/* Privacy Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Privacy Notice</AlertTitle>
            <AlertDescription>
              Your location will be captured once for verification purposes only. 
              We do not continuously track your location. This is a one-time verification.
            </AlertDescription>
          </Alert>

          {/* Consent checkbox */}
          <div className="flex items-start gap-3 p-4 border rounded-lg">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked === true)}
              disabled={verifying}
            />
            <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
              I consent to sharing my current location for the purpose of verifying my residential address. 
              I understand this is a one-time capture and my location will not be tracked continuously.
            </Label>
          </div>

          {/* Verify Button */}
          <Button 
            onClick={handleVerify} 
            className="w-full h-14 text-lg"
            disabled={!consent || verifying}
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Verifying Location...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-5 w-5" />
                Confirm My Location Now
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By clicking above, your browser will request access to your location.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationVerification;