import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  UserPlus, 
  MapPin, 
  Clock, 
  CheckCircle,
  Lock,
  Eye,
  FileCheck,
  ArrowRight
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 gradient-hero overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 animate-fade-in">
              Accurate Address Verification for Reliable Workforce Background Checks
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Night-time location verification reduces false addresses and ensures your employees actually reside where they claim. 
              One-time, consent-based verification that HR teams trust.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Button size="lg" asChild>
                <Link to="/about">
                Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/4" />
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Simple, secure, and effective address verification in four easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: UserPlus,
                step: "01",
                title: "Admin Invites Employee",
                description: "HR creates an invite with employee details and generates a secure link"
              },
              {
                icon: MapPin,
                step: "02",
                title: "Employee Sets Address",
                description: "Employee submits their residential address and selects a verification window"
              },
              {
                icon: Clock,
                step: "03",
                title: "Night-Time Confirmation",
                description: "During the selected window, employee confirms location"
              },
              {
                icon: CheckCircle,
                step: "04",
                title: "Admin Reviews Result",
                description: "HR reviews verification status and coordinates to complete the background check"
              }
            ].map((item, index) => (
              <Card key={index} className="relative overflow-hidden card-hover">
                <CardContent className="pt-8 pb-6">
                  <span className="absolute top-4 right-4 text-5xl font-bold text-primary/10">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Night Verification Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Night-Time Verification?
              </h2>
              <p className="text-muted-foreground mb-8">
                Traditional address verification methods are easily defeated. 
                Night-time verification ensures employees are actually at their claimed residence 
                during hours when they would naturally be home.
              </p>

              <div className="space-y-4">
                {[
                  "Prevents fake or borrowed addresses",
                  "Ensures employee actually resides at location",
                  "Reduces HR risk and compliance issues",
                  "One-time verification - no continuous tracking",
                  "Consent-based and privacy-respecting"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Shield, label: "Fraud Prevention", value: "95%", desc: "Reduction in false addresses" },
                { icon: Clock, label: "Quick Setup", value: "5 min", desc: "Average verification time" },
                { icon: Lock, label: "Secure", value: "100%", desc: "End-to-end encryption" },
                { icon: FileCheck, label: "Compliance", value: "SOC 2", desc: "Enterprise ready" }
              ].map((stat, index) => (
                <Card key={index} className="card-hover">
                  <CardContent className="p-6 text-center">
                    <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                    <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                    <div className="font-medium text-sm">{stat.label}</div>
                    <div className="text-xs text-muted-foreground">{stat.desc}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security & Privacy Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Security & Privacy First
            </h2>
            <p className="text-muted-foreground mb-8">
              We take data protection seriously. Our platform is designed with privacy at its core.
            </p>

            <div className="grid md:grid-cols-3 gap-6 text-left">
              {[
                {
                  icon: Eye,
                  title: "One-Time Access",
                  description: "Location is captured once during verification. No continuous tracking or monitoring."
                },
                {
                  icon: Lock,
                  title: "Consent-Based",
                  description: "Employees must explicitly grant permission before any location data is collected."
                },
                {
                  icon: Shield,
                  title: "HR Compliant",
                  description: "Designed to meet employment verification regulations and data protection standards."
                }
              ].map((feature, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <feature.icon className="h-8 w-8 text-primary mb-4" />
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Verify with Confidence?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join HR teams that trust NovusGuard for accurate, compliant address verification.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/demo">
                Request Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10" asChild>
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
