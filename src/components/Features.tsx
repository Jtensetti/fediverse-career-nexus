
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Users, 
  MessageSquare, 
  Calendar, 
  Shield, 
  Briefcase
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: <User size={28} className="text-federation-blue" />,
      title: 'Professional Profiles',
      description: 'Structured CV fields including work history, education, projects, and skills with a presentation mode and QR code sharing.'
    },
    {
      icon: <Users size={28} className="text-federation-blue" />,
      title: 'Meaningful Connections',
      description: 'Display 1st & 2nd-degree relations only with user opt-in options to appear in professional networks.'
    },
    {
      icon: <MessageSquare size={28} className="text-federation-blue" />,
      title: 'Secure Messaging',
      description: 'True DM inbox with end-to-end encryption and connection-based permissions. Only 1st & 2nd-degree can initiate.'
    },
    {
      icon: <Calendar size={28} className="text-federation-blue" />,
      title: 'Events & Live',
      description: 'Create and join events with RSVP, iCal export, embedded livestreams, and direct streaming with Jitsi integration.'
    },
    {
      icon: <Briefcase size={28} className="text-federation-blue" />,
      title: 'Job Marketplace',
      description: 'Dedicated job posts with title, location, seniority, pay transparency, and both link and inline apply options.'
    },
    {
      icon: <Shield size={28} className="text-federation-blue" />,
      title: 'Community Moderation',
      description: 'Built-in dashboard with report queue, moderation tools, and transparent instance-blocks for a healthy community.'
    }
  ];

  return (
    <section id="features" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            Features Built for Professionals
          </h2>
          <p className="text-lg text-gray-600">
            Federation combines the best aspects of professional networking with modern, privacy-focused technology.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="mb-4">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
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
