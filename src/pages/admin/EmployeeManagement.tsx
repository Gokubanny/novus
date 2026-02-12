import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  UserPlus, 
  Search, 
  Copy, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  Eye
} from 'lucide-react';
import { useAllEmployees } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

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
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Re-verify</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const EmployeeManagement = () => {
  const { data: employees, isLoading } = useAllEmployees();
  const [search, setSearch] = useState('');

  const filteredEmployees = employees?.filter(emp => 
    emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copied!',
      description: 'Invite link has been copied to clipboard.',
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground">Manage employee invites and verifications</p>
        </div>
        <Button asChild>
          <Link to="/admin/employees/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Employees ({filteredEmployees.length})</CardTitle>
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
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search ? (
                <p>No employees found matching "{search}"</p>
              ) : (
                <>
                  <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No employees yet</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link to="/admin/employees/new">Add your first employee</Link>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => {
                    const latestVerification = employee.verification_records?.[0];
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.full_name}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.phone || '-'}</TableCell>
                        <TableCell>
                          {getStatusBadge(employee.invite_status, latestVerification?.status)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(employee.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {employee.invite_status === 'invited' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyInviteLink(employee.invite_token)}
                                title="Copy invite link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/admin/employees/${employee.id}`} title="View details">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
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

export default EmployeeManagement;
