import { motion } from "framer-motion";
import { User, Server, Globe, ArrowRight, ArrowLeftRight, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const FederationVisual = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: User,
      number: 1,
      titleKey: "step1Title",
      descKey: "step1Desc",
    },
    {
      icon: Server,
      number: 2,
      titleKey: "step2Title",
      descKey: "step2Desc",
    },
    {
      icon: Globe,
      number: 3,
      titleKey: "step3Title",
      descKey: "step3Desc",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-secondary font-semibold text-sm uppercase tracking-wide mb-2 block">
            {t("homepage.federation.subtitle")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
            {t("homepage.federation.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("homepage.federation.description")}
          </p>
        </motion.div>

        {/* Visual Federation Diagram */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="relative aspect-square max-w-lg mx-auto">
            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
              {/* Animated connection lines */}
              <motion.line
                x1="200" y1="200" x2="80" y2="80"
                stroke="hsl(var(--secondary))"
                strokeWidth="2"
                strokeDasharray="5,5"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.5 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.5 }}
              />
              <motion.line
                x1="200" y1="200" x2="320" y2="80"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="5,5"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.5 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.7 }}
              />
              <motion.line
                x1="200" y1="200" x2="80" y2="320"
                stroke="hsl(var(--accent))"
                strokeWidth="2"
                strokeDasharray="5,5"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.5 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.9 }}
              />
              <motion.line
                x1="200" y1="200" x2="320" y2="320"
                stroke="hsl(var(--secondary))"
                strokeWidth="2"
                strokeDasharray="5,5"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.5 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 1.1 }}
              />
            </svg>

            {/* Center Instance (Nolto) */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", duration: 0.8 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary shadow-xl flex flex-col items-center justify-center text-primary-foreground border-4 border-background">
                <Server className="h-8 w-8 mb-1" />
                <span className="font-bold text-sm">nolto.org</span>
                <span className="text-xs opacity-80">{t("homepage.federation.youAreHere")}</span>
              </div>
            </motion.div>

            {/* Surrounding Instances */}
            {[
              { name: "fosstodon.org", users: "50K+", x: "left-4", y: "top-4" },
              { name: "mastodon.social", users: "1M+", x: "right-4", y: "top-4" },
              { name: "hachyderm.io", users: "30K+", x: "left-4", y: "bottom-4" },
              { name: "tech.lgbt", users: "15K+", x: "right-4", y: "bottom-4" },
            ].map((instance, index) => (
              <motion.div
                key={instance.name}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", duration: 0.6, delay: 0.2 + index * 0.15 }}
                className={`absolute ${instance.x} ${instance.y}`}
              >
                <div className="w-20 h-20 rounded-full bg-card shadow-lg border-2 border-border flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors">
                  <Server className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs font-medium text-foreground leading-tight">{instance.name.split(".")[0]}</span>
                  <span className="text-[10px] text-muted-foreground">{instance.users}</span>
                </div>
              </motion.div>
            ))}

            {/* Animated data flow indicators */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-secondary/30"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-primary/20"
            />
          </div>
        </div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative text-center"
              >
                {/* Connector arrow (hidden on mobile) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 -right-4 z-10">
                    <ArrowRight className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}

                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                    <step.icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm shadow-md">
                    {step.number}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{t(`homepage.federation.${step.titleKey}`)}</h3>
                <p className="text-muted-foreground text-sm">{t(`homepage.federation.${step.descKey}`)}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Key Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <div className="bg-card rounded-xl border shadow-lg p-6 md:p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{t("homepage.federation.dataPortability")}</h4>
                  <p className="text-sm text-muted-foreground">{t("homepage.federation.dataPortabilityDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{t("homepage.federation.universalReach")}</h4>
                  <p className="text-sm text-muted-foreground">{t("homepage.federation.universalReachDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{t("homepage.federation.yourChoice")}</h4>
                  <p className="text-sm text-muted-foreground">{t("homepage.federation.yourChoiceDesc")}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FederationVisual;
