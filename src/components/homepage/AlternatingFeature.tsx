import { motion } from "framer-motion";
import { ReactNode } from "react";
import { 
  Clock, 
  Shield, 
  Briefcase, 
  Globe, 
  UserCheck, 
  Database,
  Zap,
  Lock,
  Users,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppScreenshot from "./AppScreenshot";

interface FeatureBlockProps {
  title: string;
  subtitle: string;
  description: string;
  benefits: { icon: ReactNode; text: string }[];
  screenshotVariant: "feed" | "profile" | "jobs";
  reversed?: boolean;
  ctaText?: string;
  ctaLink?: string;
}

const FeatureBlock = ({ 
  title, 
  subtitle, 
  description, 
  benefits, 
  screenshotVariant, 
  reversed = false,
  ctaText,
  ctaLink
}: FeatureBlockProps) => {
  return (
    <div className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${reversed ? "lg:flex-row-reverse" : ""}`}>
      {/* Text Content */}
      <motion.div
        initial={{ opacity: 0, x: reversed ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className={`${reversed ? "lg:order-2" : ""}`}
      >
        <span className="text-secondary font-semibold text-sm uppercase tracking-wide mb-2 block">
          {subtitle}
        </span>
        <h3 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4 leading-tight">
          {title}
        </h3>
        <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
          {description}
        </p>
        
        <ul className="space-y-4 mb-8">
          {benefits.map((benefit, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
                {benefit.icon}
              </div>
              <span className="text-foreground">{benefit.text}</span>
            </motion.li>
          ))}
        </ul>

        {ctaText && ctaLink && (
          <Button asChild variant="outline" size="lg" className="group">
            <Link to={ctaLink}>
              {ctaText}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        )}
      </motion.div>

      {/* Screenshot */}
      <motion.div
        initial={{ opacity: 0, x: reversed ? -30 : 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`${reversed ? "lg:order-1" : ""}`}
      >
        <div className="relative">
          {/* Decorative elements */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl blur-xl" />
          <AppScreenshot variant={screenshotVariant} className="relative z-10" />
        </div>
      </motion.div>
    </div>
  );
};

const AlternatingFeatures = () => {
  const features: FeatureBlockProps[] = [
    {
      title: "Your Timeline, Your Control",
      subtitle: "No Algorithms",
      description: "See posts in chronological order from people you actually follow. No engagement-bait promoted to manipulate your attention.",
      benefits: [
        { icon: <Clock className="h-4 w-4 text-secondary" />, text: "Chronological timeline — no algorithmic manipulation" },
        { icon: <Shield className="h-4 w-4 text-secondary" />, text: "No tracking pixels or invasive analytics" },
        { icon: <Zap className="h-4 w-4 text-secondary" />, text: "Lightning fast, distraction-free experience" },
      ],
      screenshotVariant: "feed",
      ctaText: "Explore the Feed",
      ctaLink: "/feed"
    },
    {
      title: "Build Your Professional Identity",
      subtitle: "Portable Profile",
      description: "Create a professional profile that you own forever. Take your connections, posts, and reputation with you if you ever switch instances.",
      benefits: [
        { icon: <UserCheck className="h-4 w-4 text-secondary" />, text: "Verified credentials and skill endorsements" },
        { icon: <Database className="h-4 w-4 text-secondary" />, text: "Full data export at any time" },
        { icon: <Lock className="h-4 w-4 text-secondary" />, text: "Your identity, your rules" },
      ],
      screenshotVariant: "profile",
      reversed: true,
      ctaText: "Create Your Profile",
      ctaLink: "/auth/signup"
    },
    {
      title: "Find Opportunities That Matter",
      subtitle: "Transparent Hiring",
      description: "Browse job listings from companies that respect privacy and open-source values. Salary transparency, remote-first roles, and no recruiter spam.",
      benefits: [
        { icon: <Briefcase className="h-4 w-4 text-secondary" />, text: "Salary ranges on every job listing" },
        { icon: <Users className="h-4 w-4 text-secondary" />, text: "Direct connections, no middlemen" },
        { icon: <Globe className="h-4 w-4 text-secondary" />, text: "Cross-instance job discovery" },
      ],
      screenshotVariant: "jobs",
      ctaText: "Browse Jobs",
      ctaLink: "/jobs"
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-24 md:space-y-32">
          {features.map((feature, index) => (
            <FeatureBlock key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AlternatingFeatures;
