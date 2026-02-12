import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Copy, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Map
} from 'lucide-react';
import { useEmployeeById, useRequestReverification, useCompanySettings } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { formatDistance } from '@/lib/geocoding';
import VerificationMap from '@/components/admin/VerificationMap';

const getStatusBadge = (inviteStatus: string, verificationStatus?: string) => {
  if (inviteStatus === 'invited') {
    return <Badge variant="secondary" className="gap-1"><Mail className="h-3 w-3" /> Invited</Badge>;
  }
  
  switch (verificationStatus) {
    case 'verified':
      return <Badge className="gap-1 bg-success hover:bg-success/90"><CheckCircle className="h-3 w-3" /> Verified</Badge>;
    case 'pending_verification':
      return <Badge variant="outline" className="gap-1 text-warning border-warning"><Clock className="h-3 w-3" /> Pending Verification</Badge>;
    case 'pending_address':
      return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending Address</Badge>;
    case 'failed':
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Failed</Badge>;
    case 'reverification_required':
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Re-verify Required</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const EmployeeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: employee, isLoading } = useEmployeeById(id);
  const { data: settings } = useCompanySettings();
  const requestReverification = useRequestReverification();

  const latestVerification = employee?.verification_records?.[0] as any;
  const distanceThreshold = (settings as any)?.distance_threshold_km ?? 1.0;

  const copyInviteLink = () => {
    if (employee) {
      const link = `${window.location.origin}/invite?token=${employee.invite_token}`;
      navigator.clipboard.writeText(link);
      toast({
        title: 'Link copied!',
        description: 'Invite link has been copied to clipboard.',
      });
    }
  };

  const handleRequestReverification = async () => {
    if (!latestVerification) return;

    try {
      await requestReverification.mutateAsync(latestVerification.id);
      toast({
        title: 'Re-verification requested',
        description: 'The employee will need to verify their location again.',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to request re-verification',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Employee Not Found</h2>
        <Button asChild>
          <Link to="/admin/employees">Back to Employees</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/employees')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Employees
      </Button>

      {/* Employee Info */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{employee.full_name}</CardTitle>
              <CardDescription>
                Added {format(new Date(employee.created_at), 'MMMM d, yyyy')}
              </CardDescription>
            </div>
            {getStatusBadge(employee.invite_status, latestVerification?.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{employee.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{employee.phone || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {employee.invite_status === 'invited' && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Invite Link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm overflow-hidden text-ellipsis">
                    {window.location.origin}/invite?token={employee.invite_token}
                  </code>
                  <Button onClick={copyInviteLink} size="icon" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Verification Details */}
      {latestVerification && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Address */}
            {latestVerification.street && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Submitted Address</p>
                  <p className="font-medium">
                    {latestVerification.street}
                    {latestVerification.city && `, ${latestVerification.city}`}
                    {latestVerification.state && `, ${latestVerification.state}`}
                    {latestVerification.zip && ` ${latestVerification.zip}`}
                  </p>
                  {latestVerification.landmark && (
                    <p className="text-sm text-muted-foreground">
                      Landmark: {latestVerification.landmark}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Verification Window */}
            {latestVerification.verification_window_start && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Verification Window</p>
                  <p className="font-medium">
                    {latestVerification.verification_window_start} - {latestVerification.verification_window_end}
                  </p>
                </div>
              </div>
            )}

            {/* Distance Warning */}
            {latestVerification?.distance_flagged && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Distance Mismatch Detected</AlertTitle>
                <AlertDescription>
                  The employee verified their location {formatDistance(latestVerification.distance_km)} from their submitted address. 
                  This exceeds the {distanceThreshold}km threshold and may indicate the address is incorrect.
                </AlertDescription>
              </Alert>
            )}

            {/* Verification Result */}
            {latestVerification.verified_at && (
              <div className={`p-4 rounded-lg ${latestVerification.distance_flagged ? 'bg-destructive/10' : 'bg-success/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {latestVerification.distance_flagged ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <span className="font-semibold text-destructive">Location Verified (Distance Flagged)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-semibold text-success">Location Verified</span>
                    </>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Verified at: </span>
                    <span className="font-medium">
                      {format(new Date(latestVerification.verified_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  {latestVerification.latitude && latestVerification.longitude && (
                    <div>
                      <span className="text-muted-foreground">Coordinates: </span>
                      <span className="font-medium">
                        {latestVerification.latitude.toFixed(6)}, {latestVerification.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                  {latestVerification.distance_km !== null && (
                    <div>
                      <span className="text-muted-foreground">Distance from address: </span>
                      <span className={`font-medium ${latestVerification.distance_flagged ? 'text-destructive' : ''}`}>
                        {formatDistance(latestVerification.distance_km)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {latestVerification.status === 'verified' && (
              <div className="pt-4">
                <Button
                  variant="outline"
                  onClick={handleRequestReverification}
                  disabled={requestReverification.isPending}
                >
                  {requestReverification.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Request Re-verification
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Location Map */}
      {latestVerification && (latestVerification.expected_latitude || latestVerification.latitude) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Location Map</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <VerificationMap
              expectedLatitude={latestVerification.expected_latitude}
              expectedLongitude={latestVerification.expected_longitude}
              actualLatitude={latestVerification.latitude}
              actualLongitude={latestVerification.longitude}
              submittedAddress={`${latestVerification.street || ''}${latestVerification.city ? `, ${latestVerification.city}` : ''}${latestVerification.state ? `, ${latestVerification.state}` : ''}`}
              distanceKm={latestVerification.distance_km}
              distanceFlagged={latestVerification.distance_flagged}
            />
          </CardContent>
        </Card>
      )}
      {!latestVerification && employee.invite_status === 'accepted' && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Awaiting Address Submission</h3>
            <p className="text-muted-foreground">
              The employee hasn't submitted their address yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeDetail;
