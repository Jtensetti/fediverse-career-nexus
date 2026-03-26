import { motion } from "framer-motion";
import { Heart, MessageCircle, Repeat2, Share2, Bell, UserPlus, Briefcase, CheckCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import avatarSarah from "@/assets/avatars/avatar-sarah.png";
import avatarMarcus from "@/assets/avatars/avatar-marcus.png";

interface AppScreenshotProps {
  variant?: "feed" | "profile" | "jobs" | "messages";
  className?: string;
}

const AppScreenshot = ({ variant = "feed", className = "" }: AppScreenshotProps) => {
  if (variant === "feed") {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-card rounded-xl shadow-2xl border overflow-hidden">
          <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-accent/60" />
              <div className="w-3 h-3 rounded-full bg-secondary/60" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground flex items-center gap-2">
                <span className="text-secondary">🔒</span>
                nolto.social/feed
              </div>
            </div>
          </div>

          <div className="bg-background p-4 space-y-3">
            {/* Post 1 */}
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border-2 border-secondary">
                  <AvatarImage src={avatarSarah} alt="Anna Lindström" />
                  <AvatarFallback className="bg-secondary/20 text-secondary font-semibold">AL</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">Anna Lindström</span>
                    <CheckCircle className="h-3.5 w-3.5 text-secondary" />
                    <span className="text-xs text-muted-foreground">Göteborgs kommun</span>
                  </div>
                  <p className="text-sm text-foreground mt-1">
                    Vi har lanserat vår nya digitala medborgarportal! 🚀 Samverkan med andra kommuner fungerar nu smidigt.
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-muted-foreground">
                    <button className="flex items-center gap-1 text-xs hover:text-secondary transition-colors">
                      <Heart className="h-4 w-4" /> <span>24</span>
                    </button>
                    <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
                      <MessageCircle className="h-4 w-4" /> <span>8</span>
                    </button>
                    <button className="flex items-center gap-1 text-xs hover:text-secondary transition-colors">
                      <Repeat2 className="h-4 w-4" /> <span>12</span>
                    </button>
                    <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Post 2 */}
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary">
                  <AvatarImage src={avatarMarcus} alt="Erik Bergman" />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">EB</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">Erik Bergman</span>
                    <span className="text-xs text-muted-foreground">Region Stockholm</span>
                  </div>
                  <p className="text-sm text-foreground mt-1">
                    Söker en IT-strateg till vår digitaliseringsenhet. Flexibelt arbete, trygg anställning. Hör av dig!
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-muted-foreground">
                    <button className="flex items-center gap-1 text-xs hover:text-secondary transition-colors">
                      <Heart className="h-4 w-4 fill-secondary text-secondary" /> <span>47</span>
                    </button>
                    <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
                      <MessageCircle className="h-4 w-4" /> <span>15</span>
                    </button>
                    <button className="flex items-center gap-1 text-xs hover:text-secondary transition-colors">
                      <Repeat2 className="h-4 w-4" /> <span>23</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Notification */}
        <motion.div
          initial={{ opacity: 0, y: 20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute -top-4 -right-4 bg-card rounded-lg shadow-xl border p-3 flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
            <Bell className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Ny kontakt</p>
            <p className="text-xs text-muted-foreground">från Region Skåne</p>
          </div>
        </motion.div>

        {/* Floating Connection Request */}
        <motion.div
          initial={{ opacity: 0, y: -20, x: -20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="absolute -bottom-4 -left-4 bg-card rounded-lg shadow-xl border p-3 flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <UserPlus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Kontaktförfrågan</p>
            <p className="text-xs text-muted-foreground">3 väntande</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-card rounded-xl shadow-2xl border overflow-hidden">
          <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-accent/60" />
              <div className="w-3 h-3 rounded-full bg-secondary/60" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground flex items-center gap-2">
                <span className="text-secondary">🔒</span>
                nolto.social/@anna
              </div>
            </div>
          </div>

          <div className="h-20 bg-gradient-to-r from-primary to-secondary" />

          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-10">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarImage src={avatarSarah} alt="Anna Lindström" />
                <AvatarFallback className="bg-secondary text-white text-2xl font-bold">AL</AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground">Anna Lindström</h3>
                  <CheckCircle className="h-5 w-5 text-secondary" />
                </div>
                <p className="text-sm text-muted-foreground">Digitaliseringschef, Göteborgs kommun</p>
              </div>
            </div>

            <p className="text-sm text-foreground mt-4">
              Arbetar med digital transformation inom offentlig sektor. Brinner för tillgänglighet och e-tjänster.
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="secondary" className="text-xs">Digitalisering</Badge>
              <Badge variant="secondary" className="text-xs">E-tjänster</Badge>
              <Badge variant="secondary" className="text-xs">Projektledning</Badge>
              <Badge variant="secondary" className="text-xs">Tillgänglighet</Badge>
            </div>

            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <span className="font-bold text-foreground">1,2K</span>
                <span className="text-muted-foreground ml-1">Kontakter</span>
              </div>
              <div>
                <span className="font-bold text-foreground">847</span>
                <span className="text-muted-foreground ml-1">Inlägg</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "jobs") {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-card rounded-xl shadow-2xl border overflow-hidden">
          <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-accent/60" />
              <div className="w-3 h-3 rounded-full bg-secondary/60" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground flex items-center gap-2">
                <span className="text-secondary">🔒</span>
                nolto.social/jobb
              </div>
            </div>
          </div>

          <div className="bg-background p-4 space-y-3">
            <div className="bg-card rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-foreground">IT-strateg</h4>
                  <p className="text-xs text-muted-foreground">Region Stockholm • Hybrid</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">Digitalisering</Badge>
                    <Badge variant="secondary" className="text-xs">Strategi</Badge>
                  </div>
                  <p className="text-sm font-semibold text-secondary mt-2">55 000 - 65 000 kr/mån</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-foreground">Systemutvecklare</h4>
                  <p className="text-xs text-muted-foreground">Malmö kommun • Malmö</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">React</Badge>
                    <Badge variant="secondary" className="text-xs">TypeScript</Badge>
                  </div>
                  <p className="text-sm font-semibold text-secondary mt-2">48 000 - 58 000 kr/mån</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AppScreenshot;
