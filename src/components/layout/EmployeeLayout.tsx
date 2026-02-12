import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  LayoutDashboard, 
  MapPin, 
  LogOut,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const EmployeeLayout = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/employee" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-semibold text-xl text-primary">NovusGuard</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Button
              variant={isActive('/employee') ? 'secondary' : 'ghost'}
              size="sm"
              asChild
            >
              <Link to="/employee">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button
              variant={isActive('/employee/address') ? 'secondary' : 'ghost'}
              size="sm"
              asChild
            >
              <Link to="/employee/address">
                <MapPin className="h-4 w-4 mr-2" />
                Address
              </Link>
            </Button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium truncate max-w-[150px]">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t">
          <div className="container flex">
            <Link
              to="/employee"
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors",
                isActive('/employee')
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              to="/employee/address"
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors",
                isActive('/employee/address')
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              )}
            >
              <MapPin className="h-4 w-4" />
              Address
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
