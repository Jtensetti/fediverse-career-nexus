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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const features: FeatureBlockProps[] = [
    {
      title: t("homepage.features.timelineTitle"),
      subtitle: t("homepage.features.noAlgorithms"),
      description: t("homepage.features.timelineDesc"),
      benefits: [
        { icon: <Clock className="h-4 w-4 text-secondary" />, text: t("homepage.features.chronological") },
        { icon: <Shield className="h-4 w-4 text-secondary" />, text: t("homepage.features.noTracking") },
        { icon: <Zap className="h-4 w-4 text-secondary" />, text: t("homepage.features.fastExperience") },
      ],
      screenshotVariant: "feed",
      ctaText: t("homepage.features.exploreFeed"),
      ctaLink: "/feed"
    },
    {
      title: t("homepage.features.profileTitle"),
      subtitle: t("homepage.features.portableProfile"),
      description: t("homepage.features.profileDesc"),
      benefits: [
        { icon: <UserCheck className="h-4 w-4 text-secondary" />, text: t("homepage.features.verifiedCredentials") },
        { icon: <Database className="h-4 w-4 text-secondary" />, text: t("homepage.features.dataExport") },
        { icon: <Lock className="h-4 w-4 text-secondary" />, text: t("homepage.features.yourRules") },
      ],
      screenshotVariant: "profile",
      reversed: true,
      ctaText: t("homepage.features.createProfile"),
      ctaLink: "/auth/signup"
    },
    {
      title: t("homepage.features.jobsTitle"),
      subtitle: t("homepage.features.transparentHiring"),
      description: t("homepage.features.jobsDesc"),
      benefits: [
        { icon: <Briefcase className="h-4 w-4 text-secondary" />, text: t("homepage.features.salaryRanges") },
        { icon: <Users className="h-4 w-4 text-secondary" />, text: t("homepage.features.directConnections") },
        { icon: <Globe className="h-4 w-4 text-secondary" />, text: t("homepage.features.crossInstance") },
      ],
      screenshotVariant: "jobs",
      ctaText: t("homepage.features.browseJobs"),
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
