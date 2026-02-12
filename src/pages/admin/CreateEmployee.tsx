import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { useCreateEmployee } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const employeeSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
});

const CreateEmployee = () => {
  const navigate = useNavigate();
  const createEmployee = useCreateEmployee();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    const result = employeeSchema.safeParse({ fullName, email, phone });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    try {
      const employee = await createEmployee.mutateAsync({
        fullName,
        email,
        phone: phone || undefined,
      });

      const link = `${window.location.origin}/invite?token=${employee.invite_token}`;
      setInviteLink(link);
      
      toast({
        title: 'Employee created!',
        description: 'The invite link is ready to share.',
      });
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        setError('An employee with this email already exists.');
      } else {
        setError(err.message || 'Failed to create employee');
      }
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast({
        title: 'Copied!',
        description: 'Invite link copied to clipboard.',
      });
    }
  };

  const createAnother = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setInviteLink(null);
    setError(null);
  };

  if (inviteLink) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/employees')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employees
        </Button>

        <Card>
          <CardContent className="pt-8 text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Employee Created!</h2>
            <p className="text-muted-foreground mb-6">
              Share the invite link below with <strong>{fullName}</strong> to complete their registration.
            </p>

            <div className="bg-muted p-4 rounded-lg mb-6">
              <Label className="text-sm text-muted-foreground mb-2 block">Invite Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyLink} size="icon" variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={copyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" onClick={createAnother}>
                Create Another Employee
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/employees')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Employees
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Add New Employee</CardTitle>
          <CardDescription>
            Create an employee record and generate an invite link
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
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={createEmployee.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={createEmployee.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={createEmployee.isPending}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={createEmployee.isPending}
            >
              {createEmployee.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Employee & Generate Invite'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEmployee;
