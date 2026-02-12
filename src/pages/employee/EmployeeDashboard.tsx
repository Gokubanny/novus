import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useCurrentEmployee, useEmployeeVerification } from '@/hooks/useEmployee';
import { Skeleton } from '@/components/ui/skeleton';

const getStatusConfig = (status: string | undefined) => {
  switch (status) {
    case 'verified':
      return {
        icon: CheckCircle,
        title: 'Address Verified',
        description: 'Your residential address has been successfully verified.',
        color: 'text-success',
        bgColor: 'bg-success/10',
        borderColor: 'border-success/30',
      };
    case 'pending_verification':
      return {
        icon: Clock,
        title: 'Awaiting Verification',
        description: 'Your address is saved. Please confirm your location during your verification window.',
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        borderColor: 'border-warning/30',
      };
    case 'reverification_required':
      return {
        icon: AlertTriangle,
        title: 'Re-verification Required',
        description: 'Your admin has requested that you verify your location again.',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/30',
      };
    case 'failed':
      return {
        icon: AlertTriangle,
        title: 'Verification Failed',
        description: 'There was an issue with your verification. Please try again.',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/30',
      };
    default:
      return {
        icon: MapPin,
        title: 'Submit Your Address',
        description: 'Please submit your residential address to begin the verification process.',
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/30',
      };
  }
};

const EmployeeDashboard = () => {
  const { data: employee, isLoading: employeeLoading } = useCurrentEmployee();
  const { data: verification, isLoading: verificationLoading } = useEmployeeVerification(employee?.id);

  const isLoading = employeeLoading || verificationLoading;
  const statusConfig = getStatusConfig(verification?.status);
  const StatusIcon = statusConfig.icon;

  const canVerifyNow = () => {
    if (!verification || verification.status !== 'pending_verification') return false;
    if (!verification.verification_window_start || !verification.verification_window_end) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = verification.verification_window_start;
    const end = verification.verification_window_end;

    // Handle overnight windows (e.g., 22:00 - 04:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    return currentTime >= start && currentTime <= end;
  };

  const isInWindow = canVerifyNow();

  if (isLoading) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          Welcome, {employee?.full_name?.split(' ')[0] || 'Employee'}!
        </h1>
        <p className="text-muted-foreground">Your address verification status</p>
      </div>

      {/* Status Card */}
      <Card className={`border-2 ${statusConfig.borderColor}`}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${statusConfig.bgColor}`}>
              <StatusIcon className={`h-8 w-8 ${statusConfig.color}`} />
            </div>
            <div className="flex-1">
              <h2 className={`text-xl font-semibold ${statusConfig.color}`}>
                {statusConfig.title}
              </h2>
              <p className="text-muted-foreground mt-1">
                {statusConfig.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions based on status */}
      {!verification || verification.status === 'pending_address' ? (
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Complete your address verification</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/employee/address">
                <MapPin className="h-4 w-4 mr-2" />
                Submit Your Address
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : verification.status === 'pending_verification' || verification.status === 'reverification_required' ? (
        <>
          {/* Verification Window Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Verification Window
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Your verification window</p>
                  <p className="text-2xl font-bold">
                    {verification.verification_window_start} - {verification.verification_window_end}
                  </p>
                </div>
                {isInWindow ? (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/20 text-success text-sm font-medium">
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      Window Open
                    </span>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted-foreground/20 text-muted-foreground text-sm font-medium">
                      Window Closed
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verify Button */}
          <Card>
            <CardHeader>
              <CardTitle>Confirm Your Location</CardTitle>
              <CardDescription>
                {isInWindow 
                  ? 'Your verification window is now open. Click below to confirm your location.'
                  : 'Wait for your verification window to open, then confirm your location.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                className="w-full sm:w-auto"
                disabled={!isInWindow}
              >
                <Link to="/employee/verify">
                  <MapPin className="h-4 w-4 mr-2" />
                  Confirm My Location Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              {!isInWindow && (
                <p className="text-sm text-muted-foreground mt-3">
                  This button will be enabled during your verification window.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : verification.status === 'verified' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              Verification Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-success/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Verified Address</p>
                <p className="font-medium">
                  {verification.street}
                  {verification.city && `, ${verification.city}`}
                  {verification.state && `, ${verification.state}`}
                  {verification.zip && ` ${verification.zip}`}
                </p>
              </div>
              {verification.verified_at && (
                <p className="text-sm text-muted-foreground">
                  Verified on {new Date(verification.verified_at).toLocaleDateString()} at{' '}
                  {new Date(verification.verified_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Re-verification Alert */}
      {verification?.status === 'reverification_required' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Re-verification Required</AlertTitle>
          <AlertDescription>
            Your administrator has requested that you verify your location again. 
            Please confirm during your verification window.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default EmployeeDashboard;
