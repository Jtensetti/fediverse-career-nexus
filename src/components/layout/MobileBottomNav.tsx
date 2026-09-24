import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, Plus, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

const navItems = [
  { to: "/feed", icon: Home, label: "nav.feed" },
  { to: "/jobs", icon: Search, label: "nav.jobs" },
  { to: "/messages", icon: MessageSquare, label: "nav.messages" },
  { to: "/profile", icon: User, label: "nav.profileShort" },
];

export default function MobileBottomNav() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  if (location.pathname.startsWith("/auth")) return null;
  if (location.pathname.startsWith("/articles/create")) return null;
  if (location.pathname.startsWith("/articles/edit")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border md:hidden"
      data-mobile-bottom-nav
      role="navigation"
      aria-label={t('nav.mobile')}
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
              aria-label={t(label)}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && <span aria-hidden="true" className="absolute top-1 h-1 w-8 rounded-full bg-primary" />}
              <Icon
                className={cn(
                  "h-5 w-5 mb-1"
                )}
                fill={isActive ? "currentColor" : "none"}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-xs font-medium">{t(label)}</span>
            </NavLink>
          );
        })}

        <NavLink
          to="/feed?compose=1"
          className="relative flex items-center justify-center -mt-6"
          aria-label={t('feed.createPost')}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Plus className="h-6 w-6" />
          </span>
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
              aria-label={t(label)}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && <span aria-hidden="true" className="absolute top-1 h-1 w-8 rounded-full bg-primary" />}
              <Icon
                className={cn(
                  "h-5 w-5 mb-1"
                )}
                fill={isActive ? "currentColor" : "none"}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-xs font-medium">{t(label)}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
