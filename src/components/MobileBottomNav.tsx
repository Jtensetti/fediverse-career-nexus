import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, Plus, MessageSquare, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/feed", icon: Home, label: "Flöde" },
  { to: "/jobs", icon: Search, label: "Jobb" },
  { to: "/messages", icon: MessageSquare, label: "Meddelanden" },
  { to: "/profile", icon: User, label: "Profil" },
];

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  if (location.pathname.startsWith("/auth")) return null;
  if (location.pathname.startsWith("/articles/create")) return null;
  if (location.pathname.startsWith("/articles/edit")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border md:hidden"
      role="navigation"
      aria-label="Mobilnavigering"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.slice(0, 2).map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-1 w-8 h-1 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 mb-1 transition-transform",
                  isActive && "scale-110"
                )}
                fill={isActive ? "currentColor" : "none"}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          );
        })}

        <NavLink
          to="/articles/create"
          className="relative flex items-center justify-center -mt-6"
          aria-label="Skapa nytt inlägg"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          >
            <Plus className="h-6 w-6" />
          </motion.div>
        </NavLink>

        {navItems.slice(2).map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-1 w-8 h-1 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 mb-1 transition-transform",
                  isActive && "scale-110"
                )}
                fill={isActive ? "currentColor" : "none"}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
