import { motion } from "framer-motion";
import { Globe, Code, Lock, Server, Shield, Users } from "lucide-react";

const FeaturedIn = () => {
  const badges = [
    { icon: Globe, label: "ActivityPub", description: "Open Protocol" },
    { icon: Code, label: "Open Source", description: "MIT Licensed" },
    { icon: Lock, label: "Privacy First", description: "GDPR Compliant" },
    { icon: Server, label: "Self-Hostable", description: "Your Infrastructure" },
    { icon: Shield, label: "Secure", description: "End-to-End Encrypted" },
    { icon: Users, label: "Community", description: "User Governed" },
  ];

  return (
    <section className="py-16 bg-muted/30 border-y">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
            Built on open standards trusted by millions
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-5xl mx-auto">
          {badges.map((badge, index) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-background shadow-sm border flex items-center justify-center mb-3 group-hover:shadow-md group-hover:border-primary/30 transition-all">
                <badge.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="font-semibold text-foreground text-sm">{badge.label}</h4>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Compatible platforms */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 flex flex-wrap justify-center items-center gap-4 text-sm text-muted-foreground"
        >
          <span className="font-medium text-foreground">Compatible with:</span>
          <div className="flex flex-wrap justify-center gap-3">
            {["Mastodon", "Pleroma", "Pixelfed", "PeerTube", "Lemmy", "Misskey"].map((platform) => (
              <span 
                key={platform}
                className="px-3 py-1.5 bg-background rounded-full border text-xs font-medium hover:border-primary/30 transition-colors"
              >
                {platform}
              </span>
            ))}
            <span className="px-3 py-1.5 bg-secondary/10 text-secondary rounded-full text-xs font-medium">
              + 5,000 more
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedIn;
