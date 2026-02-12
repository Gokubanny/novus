import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, CheckCircle } from 'lucide-react';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

const AdminSettings = () => {
  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();

  const [companyName, setCompanyName] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [distanceThreshold, setDistanceThreshold] = useState('1.0');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name);
      setWindowStart(settings.default_window_start);
      setWindowEnd(settings.default_window_end);
      setDistanceThreshold(((settings as any).distance_threshold_km ?? 1.0).toString());
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settings) return;

    try {
      await updateSettings.mutateAsync({
        id: settings.id,
        companyName,
        defaultWindowStart: windowStart,
        defaultWindowEnd: windowEnd,
        distanceThresholdKm: parseFloat(distanceThreshold) || 1.0,
      });

      setSaved(true);
      toast({
        title: 'Settings saved',
        description: 'Your changes have been saved successfully.',
      });

      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save settings',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your verification system</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Basic information about your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company Name"
                disabled={updateSettings.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Verification Window */}
        <Card>
          <CardHeader>
            <CardTitle>Default Verification Window</CardTitle>
            <CardDescription>
              The time range during which employees can verify their location.
              This can be overridden for individual employees.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="windowStart">Start Time</Label>
                <Input
                  id="windowStart"
                  type="time"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  disabled={updateSettings.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="windowEnd">End Time</Label>
                <Input
                  id="windowEnd"
                  type="time"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  disabled={updateSettings.isPending}
                />
              </div>
            </div>
            <Alert>
              <AlertDescription>
                For night-time verification, set a window that spans overnight hours 
                (e.g., 22:00 to 04:00). Employees will only be able to confirm their 
                location during this window.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Distance Threshold */}
        <Card>
          <CardHeader>
            <CardTitle>Address Verification Threshold</CardTitle>
            <CardDescription>
              Maximum allowed distance between the submitted address and verified location.
              Verifications exceeding this will be flagged for review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="distanceThreshold">Distance Threshold (km)</Label>
              <Input
                id="distanceThreshold"
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={distanceThreshold}
                onChange={(e) => setDistanceThreshold(e.target.value)}
                disabled={updateSettings.isPending}
              />
              <p className="text-sm text-muted-foreground">
                Recommended: 1km for urban areas, 2-3km for rural areas
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Security settings and compliance information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium">Row-Level Security Enabled</p>
                <p className="text-sm text-muted-foreground">
                  Data is isolated per user with secure access controls
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium">One-Time Verification</p>
                <p className="text-sm text-muted-foreground">
                  Location is captured once, no continuous tracking
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium">Invite-Only Access</p>
                <p className="text-sm text-muted-foreground">
                  Employees can only join via admin-generated invite links
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;