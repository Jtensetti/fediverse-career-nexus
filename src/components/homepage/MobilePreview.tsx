import { motion } from "framer-motion";
import { Smartphone, Download, CheckCircle, Bell, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const MobilePreview = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex justify-center"
          >
            {/* Phone Frame */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-8 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl rounded-full" />
              
              {/* Phone */}
              <div className="relative bg-foreground rounded-[3rem] p-3 shadow-2xl">
                <div className="bg-background rounded-[2.5rem] overflow-hidden w-[280px]">
                  {/* Status Bar */}
                  <div className="bg-muted/50 px-6 py-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">9:41</span>
                    <div className="w-20 h-6 bg-foreground rounded-full" /> {/* Notch */}
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 bg-secondary rounded-sm" />
                    </div>
                  </div>

                  {/* App Content */}
                  <div className="p-4 space-y-3 h-[500px] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-foreground">Feed</h3>
                      <div className="relative">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full" />
                      </div>
                    </div>

                    {/* Posts */}
                    <div className="space-y-3">
                      <div className="bg-card rounded-xl p-3 border shadow-sm">
                        <div className="flex items-start gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-secondary/20 text-secondary text-xs font-bold">SC</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-xs text-foreground">Sarah Chen</span>
                              <CheckCircle className="h-3 w-3 text-secondary" />
                            </div>
                            <p className="text-xs text-foreground mt-1">Just shipped a major update! 🚀</p>
                            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                              <span className="flex items-center gap-1 text-[10px]">
                                <Heart className="h-3 w-3 fill-secondary text-secondary" /> 24
                              </span>
                              <span className="flex items-center gap-1 text-[10px]">
                                <MessageCircle className="h-3 w-3" /> 8
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-card rounded-xl p-3 border shadow-sm">
                        <div className="flex items-start gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">MW</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <span className="font-semibold text-xs text-foreground">Marcus Weber</span>
                            <p className="text-xs text-foreground mt-1">Looking for a frontend engineer...</p>
                            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                              <span className="flex items-center gap-1 text-[10px]">
                                <Heart className="h-3 w-3" /> 47
                              </span>
                              <span className="flex items-center gap-1 text-[10px]">
                                <MessageCircle className="h-3 w-3" /> 15
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-card rounded-xl p-3 border shadow-sm">
                        <div className="flex items-start gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-accent/20 text-accent-foreground text-xs font-bold">PS</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <span className="font-semibold text-xs text-foreground">Priya Sharma</span>
                            <p className="text-xs text-foreground mt-1">Great discussion on open source...</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="text-secondary font-semibold text-sm uppercase tracking-wide mb-2 block">
              Available Everywhere
            </span>
            <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
              Your Network in Your Pocket
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Access Nolto from any device. Install as a Progressive Web App for a native-like experience with offline support and push notifications.
            </p>

            <div className="space-y-4 mb-8">
              {[
                "Works on iOS, Android, and desktop",
                "Install directly from your browser",
                "Offline access to your content",
                "Push notifications for important updates",
              ].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-secondary" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <Smartphone className="mr-2 h-5 w-5" />
                Get the App
              </Button>
              <Button size="lg" variant="outline">
                <Download className="mr-2 h-5 w-5" />
                How to Install
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MobilePreview;
