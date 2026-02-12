import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  UserPlus,
  ArrowRight
} from 'lucide-react';
import { useDashboardStats, useAllEmployees } from '@/hooks/useAdmin';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: employees, isLoading: employeesLoading } = useAllEmployees();

  const recentActivity = employees?.slice(0, 5).map(emp => {
    const latestRecord = emp.verification_records?.[0];
    return {
      id: emp.id,
      name: emp.full_name,
      action: latestRecord?.status === 'verified' 
        ? 'Address verified' 
        : latestRecord?.status === 'pending_verification'
        ? 'Awaiting verification'
        : emp.invite_status === 'invited'
        ? 'Invite sent'
        : 'Joined',
      time: latestRecord?.updated_at || emp.created_at,
      status: latestRecord?.status || (emp.invite_status === 'invited' ? 'invited' : 'pending_address'),
    };
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-success';
      case 'pending_verification':
      case 'pending_address':
        return 'text-warning';
      case 'failed':
      case 'reverification_required':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of employee verifications</p>
        </div>
        <Button asChild>
          <Link to="/admin/employees/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Employees
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalEmployees || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.invited || 0} pending invites
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Verified
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{stats?.verified || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Successfully verified
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending
                </CardTitle>
                <Clock className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">{stats?.pending || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Awaiting verification
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Attention Needed
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">
                  {(stats?.failed || 0) + (stats?.reverificationRequired || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Failed or needs re-verification
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/employees">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {employeesLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No employees yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link to="/admin/employees/new">Add your first employee</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {activity.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{activity.name}</p>
                      <p className={`text-sm ${getStatusColor(activity.status)}`}>
                        {activity.action}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(activity.time), 'MMM d, h:mm a')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" asChild>
              <Link to="/admin/employees/new">
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Employee
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/employees">
                <Users className="h-4 w-4 mr-2" />
                View All Employees
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/verification">
                <CheckCircle className="h-4 w-4 mr-2" />
                Review Verifications
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/settings">
                <Clock className="h-4 w-4 mr-2" />
                Configure Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
