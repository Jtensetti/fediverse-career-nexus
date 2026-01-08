import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, Shield, Globe } from "lucide-react";
import { motion } from "framer-motion";

const FinalCTA = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-secondary" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-10 left-10 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute bottom-10 right-10 w-80 h-80 bg-secondary/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "5s", animationDelay: "1s" }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-primary-foreground text-sm font-medium">Join other professionals</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display text-primary-foreground mb-6 leading-tight">
            Ready to Own Your <span className="text-accent">Professional Identity?</span>
          </h2>

          <p className="text-xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join the movement of professionals who've chosen freedom over algorithms, privacy over surveillance, and
            community over corporations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-10 py-7 text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
            >
              <Link to="/auth/signup">
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-2 border-primary-foreground/60 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 font-semibold px-10 py-7 text-lg hover:scale-105 transition-all"
            >
              <Link to="/feed">Explore First</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <Users className="h-6 w-6 text-primary-foreground/80 mb-2" />
              <span className="text-sm text-primary-foreground/70">Free Forever</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <Shield className="h-6 w-6 text-primary-foreground/80 mb-2" />
              <span className="text-sm text-primary-foreground/70">No Ads Ever</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="flex flex-col items-center"
            >
              <Globe className="h-6 w-6 text-primary-foreground/80 mb-2" />
              <span className="text-sm text-primary-foreground/70">Open Source</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
