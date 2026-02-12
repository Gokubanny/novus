import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Clock,
  CheckCircle,
  ArrowRight,
  Briefcase,
  Scale,
  TrendingUp
} from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-16 md:py-24 gradient-hero">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Enterprise-Grade Address Verification for HR Teams
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Built specifically for background checks, employee onboarding, and workforce compliance. 
              NovusGuard helps HR teams reduce risk and ensure reliable employee verification.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 bg-background">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Key Use Cases</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Briefcase,
                title: "Pre-Employment Screening",
                description: "Verify candidate addresses as part of your background check process before making hiring decisions."
              },
              {
                icon: Building2,
                title: "Corporate Onboarding",
                description: "Ensure new hires provide accurate residential information for HR records and compliance documentation."
              },
              {
                icon: Scale,
                title: "Regulatory Compliance",
                description: "Meet industry-specific requirements for address verification in regulated sectors like finance and healthcare."
              }
            ].map((useCase, index) => (
              <Card key={index} className="card-hover">
                <CardContent className="pt-8 pb-6">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                    <useCase.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{useCase.title}</h3>
                  <p className="text-muted-foreground">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Why HR Teams Choose NovusGuard
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Reduce Fraud Risk",
                    description: "Night-time verification catches fake addresses that daytime methods miss."
                  },
                  {
                    icon: Clock,
                    title: "Faster Onboarding",
                    description: "Automated verification reduces manual checks and speeds up hiring."
                  },
                  {
                    icon: Users,
                    title: "Build Workforce Trust",
                    description: "Verified addresses create a foundation of trust from day one."
                  },
                  {
                    icon: TrendingUp,
                    title: "Improve Compliance",
                    description: "Meet regulatory requirements with auditable verification records."
                  }
                ].map((benefit, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-8 border">
              <h3 className="text-xl font-semibold mb-6">Key Features</h3>
              <ul className="space-y-4">
                {[
                  "Secure invite-based employee registration",
                  "Customizable verification windows",
                  "Real-time location confirmation",
                  "Admin dashboard with full visibility",
                  "One-time verification (no tracking)",
                  "Export-ready compliance reports",
                  "Role-based access control",
                  "GDPR & privacy compliant"
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How Verification Works */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              The Verification Process
            </h2>

            <div className="space-y-8">
              {[
                {
                  step: 1,
                  title: "Employee Receives Invite",
                  description: "Admin creates an employee record with name, email, and phone. The system generates a unique, secure invite link that can be shared with the employee."
                },
                {
                  step: 2,
                  title: "Account Setup & Address Entry",
                  description: "Employee opens the invite link, creates their password, and submits their residential address. They select a verification window during night hours."
                },
                {
                  step: 3,
                  title: "Night-Time Location Confirmation",
                  description: "During the selected window, the employee opens the app and confirms their location with a single click. Browser geolocation captures coordinates."
                },
                {
                  step: 4,
                  title: "Admin Review & Approval",
                  description: "HR views the verification result including timestamp, coordinates, and status. They can approve, reject, or request re-verification if needed."
                }
              ].map((step, index) => (
                <div key={index} className="flex gap-6">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 gradient-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">
            Start Verifying Today
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            See how NovusGuard can improve your employee verification process.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/demo">
              Request a Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
