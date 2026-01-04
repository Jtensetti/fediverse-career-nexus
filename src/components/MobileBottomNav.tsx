import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, PlusSquare, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/feed", icon: Home, label: "Feed" },
  { to: "/jobs", icon: Search, label: "Jobs" },
  { to: "/articles/create", icon: PlusSquare, label: "Create" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  // Only show for authenticated users
  if (!user) return null;

  // Don't show on auth pages
  if (location.pathname.startsWith("/auth")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 mb-1",
                  isActive && "fill-primary/20"
                )}
              />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
