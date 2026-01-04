
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Users, 
  MessageSquare, 
  Calendar, 
  Briefcase, 
  Shield 
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: <User size={28} className="text-bondy-accent" />,
      title: 'Professional Profiles',
      description: 'Create a structured professional profile with work history, education, projects, and skills. Share via QR code or presentation mode.'
    },
    {
      icon: <Users size={28} className="text-bondy-accent" />,
      title: 'Meaningful Connections',
      description: 'Build a network of genuine connections with 1st & 2nd-degree relations, with user opt-in options to appear in professional networks.'
    },
    {
      icon: <MessageSquare size={28} className="text-bondy-accent" />,
      title: 'Secure Messaging',
      description: 'Communicate with end-to-end encrypted direct messages, with connection-based permissions so only connections can initiate conversations.'
    },
    {
      icon: <Calendar size={28} className="text-bondy-accent" />,
      title: 'Events & Live',
      description: 'Create and join professional events with RSVP functionality, calendar integration, and embedded livestreams via Jitsi.'
    },
    {
      icon: <Briefcase size={28} className="text-bondy-accent" />,
      title: 'Job Marketplace',
      description: 'Browse and post job opportunities with transparent details including title, location, seniority, and salary information.'
    },
    {
      icon: <Shield size={28} className="text-bondy-accent" />,
      title: 'Community Moderation',
      description: 'Enjoy a healthy community with built-in moderation tools, transparent instance policies, and federated content standards.'
    }
  ];

  return (
    <section id="features" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-bondy-primary">
            Features Built for Professionals
          </h2>
          <p className="text-lg text-gray-600">
            Nolto combines the best aspects of professional networking with modern, privacy-focused technology and federation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-5px]">
              <CardHeader className="pb-2">
                <div className="mb-4 p-3 inline-flex rounded-full bg-bondy-primary/10">{feature.icon}</div>
                <CardTitle className="text-xl font-display text-bondy-primary">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
