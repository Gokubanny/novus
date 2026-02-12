import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { useAllEmployees, useCompanySettings } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { formatDistance } from '@/lib/geocoding';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'verified':
      return <Badge className="gap-1 bg-success hover:bg-success/90"><CheckCircle className="h-3 w-3" /> Verified</Badge>;
    case 'pending_verification':
      return <Badge variant="outline" className="gap-1 text-warning border-warning"><Clock className="h-3 w-3" /> Pending</Badge>;
    case 'pending_address':
      return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> No Address</Badge>;
    case 'failed':
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Failed</Badge>;
    case 'reverification_required':
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Re-verify</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const VerificationReview = () => {
  const { data: employees, isLoading } = useAllEmployees();
  const { data: settings } = useCompanySettings();
  const distanceThreshold = (settings as any)?.distance_threshold_km ?? 1.0;
  // Filter to only show employees with verification records
  const employeesWithVerification = employees?.filter(
    emp => emp.invite_status === 'accepted' && emp.verification_records?.length > 0
  ) || [];

  // Sort by verification status (needs attention first)
  const sortedEmployees = [...employeesWithVerification].sort((a, b) => {
    const statusOrder = {
      'reverification_required': 0,
      'failed': 1,
      'pending_verification': 2,
      'pending_address': 3,
      'verified': 4,
    };
    const statusA = a.verification_records?.[0]?.status || 'pending_address';
    const statusB = b.verification_records?.[0]?.status || 'pending_address';
    return (statusOrder[statusA as keyof typeof statusOrder] || 5) - 
           (statusOrder[statusB as keyof typeof statusOrder] || 5);
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Verification Review</h1>
        <p className="text-muted-foreground">Review and manage employee address verifications</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {employeesWithVerification.filter(e => e.verification_records?.[0]?.status === 'verified').length}
                </p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-lg">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {employeesWithVerification.filter(e => e.verification_records?.[0]?.status === 'pending_verification').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {employeesWithVerification.filter(e => 
                    e.verification_records?.[0]?.status === 'failed' || 
                    e.verification_records?.[0]?.status === 'reverification_required'
                  ).length}
                </p>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {employeesWithVerification.filter(e => 
                    (e.verification_records?.[0] as any)?.distance_flagged === true
                  ).length}
                </p>
                <p className="text-sm text-muted-foreground">Distance Flagged</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Verifications</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : sortedEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No verifications to review yet</p>
              <p className="text-sm">Employees will appear here once they submit their addresses</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {sortedEmployees.map((employee) => {
                    const record = employee.verification_records?.[0] as any;
                    if (!record) return null;
                    
                    const distanceKm = record.distance_km;
                    const distanceFlagged = record.distance_flagged;

                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.full_name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {record.street 
                            ? `${record.street}, ${record.city || ''}`
                            : 'Not submitted'}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`flex items-center gap-1 ${distanceFlagged ? 'text-destructive font-semibold' : ''}`}>
                                  {distanceFlagged && <AlertCircle className="h-4 w-4" />}
                                  {distanceKm !== null ? formatDistance(distanceKm) : '-'}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {distanceFlagged 
                                  ? `Distance exceeds ${distanceThreshold}km threshold - needs review!`
                                  : distanceKm !== null 
                                    ? 'Distance within acceptable range'
                                    : 'Distance not yet calculated'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(record.status)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.verified_at 
                            ? format(new Date(record.verified_at), 'MMM d, h:mm a')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/admin/employees/${employee.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationReview;
