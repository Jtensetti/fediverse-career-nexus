
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Scale, Lock, Network, Eye, Settings, Users } from "lucide-react";

const InstanceGuidelines = () => {
  const guidelines = [
    {
      icon: Scale,
      title: "1. Legal Compliance",
      points: [
        "You are responsible for ensuring that your instance complies with all applicable laws and regulations, including GDPR and local data protection laws.",
        "You must provide clear information about who operates the instance and how users can contact you.",
        "Publish a Privacy Policy and Terms of Service on your instance."
      ]
    },
    {
      icon: Shield,
      title: "2. Moderation & Safety", 
      points: [
        "Implement moderation processes to prevent abuse, harassment, illegal content, and spam.",
        "Designate moderators who can respond to reports and enforce rules quickly and fairly.",
        "Remove or block users and content that violate your rules, Nolto's Code of Conduct, or applicable laws.",
        "Respond to reports from users and other instance admins in a timely manner."
      ]
    },
    {
      icon: Lock,
      title: "3. Data Protection & Privacy",
      points: [
        "Secure user data with appropriate technical and organizational measures.",
        "Allow users to export their data and delete their accounts at any time.", 
        "Limit retention of logs and personal data to what is necessary for security and operation."
      ]
    },
    {
      icon: Network,
      title: "4. Federation Responsibilities",
      points: [
        "Respect blocklists and moderation decisions from other instances.",
        "Avoid federating with instances known for harassment, abuse, or illegal activity.",
        "Maintain up-to-date contact and technical information so others can reach you if needed.",
        "Notify users if you plan major changes, downtime, or federation policy updates."
      ]
    },
    {
      icon: Eye,
      title: "5. Transparency",
      points: [
        "Make your rules and moderation practices public.",
        "Publish any blocklists or federation policies if you restrict federation with certain instances.",
        "Be open about changes to your moderation team, software version, or key policies."
      ]
    },
    {
      icon: Settings,
      title: "6. Technical Requirements", 
      points: [
        "Keep your Nolto software and dependencies up-to-date with security patches.",
        "Maintain regular backups and disaster recovery plans.",
        "Monitor your instance's performance and availability."
      ]
    },
    {
      icon: Users,
      title: "7. Community Standards",
      points: [
        "Promote an inclusive, respectful, and professional environment.",
        "Apply the Code of Conduct consistently.",
        "Foster open dialogue but act quickly on threats to user safety or legal compliance."
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto prose prose-lg dark:prose-invert">
      <p className="text-lg text-muted-foreground leading-relaxed mb-8">
        Running a Nolto instance is a responsibility. To ensure the health of the network and protect users, 
        all instance operators must follow these guidelines.
      </p>

      <div className="space-y-12">
        {guidelines.map((guideline, index) => (
          <section key={index} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <guideline.icon className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold text-primary">{guideline.title}</h2>
            </div>
            <div className={`${index % 2 === 0 ? 'bg-muted/50' : 'bg-primary/5'} p-6 rounded-lg`}>
              <ul className="space-y-4">
                {guideline.points.map((point, pointIndex) => (
                  <li key={pointIndex} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>

      <section className="bg-primary text-primary-foreground p-8 rounded-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Commitment to Guidelines</h2>
        <p className="text-lg mb-6 text-primary-foreground/90">
          By operating a Nolto instance, you agree to uphold these guidelines. 
          Failure to do so may result in defederation or removal from Nolto's public instance listings.
        </p>
        <p className="text-lg font-medium text-secondary mb-6">
          If you have questions or need support, consult the{" "}
          <Link to="/documentation" className="underline hover:text-primary-foreground transition-colors">Documentation</Link>, 
          join the community forum, or contact the Nolto team.
        </p>
      </section>
    </div>
  );
};

export default InstanceGuidelines;
