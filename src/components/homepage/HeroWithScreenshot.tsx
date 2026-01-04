import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import TrustBadges from "./TrustBadges";
import LiveStats from "./LiveStats";
import AppScreenshot from "./AppScreenshot";

const HeroWithScreenshot = () => {
  return (
    <section className="relative bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground overflow-hidden min-h-[90vh] flex items-center overflow-x-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-3xl" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Logo */}
            <motion.img 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
              alt="Nolto" 
              className="w-16 h-16 lg:w-20 lg:h-20 mx-auto lg:mx-0 mb-6 drop-shadow-lg" 
            />
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold font-display mb-4 sm:mb-6 leading-[1.1] tracking-tight">
              The Professional Network{" "}
              <span className="text-accent inline-block">
                That Respects Your Freedom
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-primary-foreground/90 mb-6 sm:mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed px-2 sm:px-0">
              Connect with professionals across the Fediverse. Own your data. Control your network. No algorithms, no ads, no lock-in.
            </p>

            {/* Trust Badges */}
            <div className="mb-8">
              <TrustBadges />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-8 sm:mb-10 px-2 sm:px-0">
              <Button 
                asChild 
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all w-full sm:w-auto"
              >
                <Link to="/auth/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-primary-foreground/80 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 font-semibold px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg hover:scale-105 transition-all backdrop-blur-sm w-full sm:w-auto"
              >
                <Link to="/feed">
                  <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Explore the Feed
                </Link>
              </Button>
            </div>

            {/* Live Stats */}
            <LiveStats />
          </motion.div>

          {/* Right Column - App Screenshot */}
          <motion.div
            initial={{ opacity: 0, x: 30, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Glow effect behind screenshot */}
              <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-secondary/30 blur-3xl scale-110" />
              
              <AppScreenshot variant="feed" className="relative z-10 transform rotate-1 hover:rotate-0 transition-transform duration-500" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex justify-center pt-2"
        >
          <div className="w-1 h-2 bg-primary-foreground/50 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroWithScreenshot;
