
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ModeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { AlignJustify, LogIn, Settings, User, UserPlus } from "lucide-react";
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from "sonner";

const Navbar = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const user = useUser();
  const supabase = useSupabaseClient();
  
  const isHomePage = location.pathname === "/";

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Successfully logged out");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrolled]);

  const authenticatedNavigationItems = [
    {
      name: t("nav.home", "Home"),
      href: "/",
    },
    {
      name: t("nav.profile", "Profile"),
      href: "/profile",
    },
    {
      name: t("nav.connections", "Connections"),
      href: "/connections",
    },
    {
      name: t("nav.articles", "Articles"),
      href: "/articles",
    },
    {
      name: t("nav.jobs", "Jobs"),
      href: "/jobs",
    },
    {
      name: t("nav.events", "Events"),
      href: "/events",
    },
    {
      name: t("nav.messages", "Messages"),
      href: "/messages",
    },
    {
      name: t("nav.feed", "Feed"),
      href: "/feed",
    },
  ];

  // For unauthenticated users, only show minimal navigation
  const unauthenticatedNavigationItems = user ? authenticatedNavigationItems : [];

  return (
    <div className={`${isHomePage ? 'absolute top-0 left-0 right-0 z-50' : 'border-b'} transition-colors duration-300 ${scrolled && isHomePage ? 'bg-white/90 backdrop-blur-md shadow-sm' : isHomePage ? 'bg-transparent' : 'bg-white'}`}>
      <div className="flex h-16 items-center px-4">
        <div className="container mx-auto flex w-full items-center justify-between">
          <div className="flex items-center gap-4">
            <RouterLink to="/" className={`font-bold text-xl flex items-center gap-2 ${isHomePage && !scrolled ? 'text-white' : 'text-bondy-primary'}`}>
              <img 
                src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                alt="Bondy" 
                className="w-8 h-8" 
              />
              <span className="font-display">Bondy</span>
            </RouterLink>
            
            {/* Only show full navigation when authenticated */}
            {user && (
              <nav className={`mx-6 hidden md:flex space-x-6 ${isHomePage && !scrolled ? 'text-white' : 'text-foreground'}`}>
                {authenticatedNavigationItems.map((item) => (
                  <RouterLink 
                    key={item.href} 
                    to={item.href}
                    className="font-medium hover:text-bondy-accent transition-colors"
                  >
                    {item.name}
                  </RouterLink>
                ))}
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <ModeToggle />
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-avatar.jpg" alt="Avatar" />
                      <AvatarFallback className="bg-bondy-primary text-white">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm font-medium text-center border-b">
                    {user.email}
                  </div>
                  <DropdownMenuItem asChild>
                    <RouterLink to="/profile" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      {t("nav.profile", "Profile")}
                    </RouterLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <RouterLink to="/profile/edit" className="cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" />
                      {t("common.edit", "Edit")} {t("nav.profile", "Profile")}
                    </RouterLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <RouterLink to="/moderation" className="cursor-pointer">
                      {t("nav.moderation", "Moderation")}
                    </RouterLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <RouterLink to="/admin/instances" className="cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" />
                      Instance Management
                    </RouterLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 hover:text-red-600 focus:bg-red-50">
                    {t("auth.logout", "Log out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex space-x-2">
                <Button 
                  asChild 
                  variant="ghost" 
                  size="sm"
                  className={`${isHomePage && !scrolled ? 'text-white hover:bg-white/10' : 'hover:bg-gray-100'}`}
                >
                  <RouterLink to="/auth/login">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </RouterLink>
                </Button>
                <Button 
                  asChild 
                  size="sm" 
                  className={isHomePage && !scrolled ? 
                    "bg-white text-bondy-primary hover:bg-white/90" : 
                    "bg-bondy-primary text-white hover:bg-bondy-primary/90"
                  }
                >
                  <RouterLink to="/auth/signup">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </RouterLink>
                </Button>
              </div>
            )}
            
            {/* Mobile menu - only show when authenticated */}
            {user && (
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className={`md:hidden ${isHomePage && !scrolled ? 'text-white' : ''}`}>
                    <AlignJustify className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sm:max-w-sm">
                  <SheetHeader>
                    <SheetTitle>
                      <div className="flex items-center gap-2">
                        <img 
                          src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                          alt="Bondy" 
                          className="w-6 h-6" 
                        />
                        <span className="font-display">Bondy</span>
                      </div>
                    </SheetTitle>
                    <SheetDescription>
                      {t("accessibility.navigationMenu", "Navigation menu")}
                    </SheetDescription>
                  </SheetHeader>
                  <nav className="grid gap-4 text-lg mt-6">
                    {authenticatedNavigationItems.map((item) => (
                      <RouterLink 
                        key={item.href} 
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className="px-2 py-1 hover:bg-muted rounded-md transition-colors"
                      >
                        {item.name}
                      </RouterLink>
                    ))}
                    <div className="border-t pt-4 mt-4">
                      <RouterLink 
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-2 py-1 hover:bg-muted rounded-md transition-colors"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </RouterLink>
                      <button 
                        onClick={() => {
                          handleLogout();
                          setIsOpen(false);
                        }}
                        className="flex items-center px-2 py-1 text-red-500 w-full text-left hover:bg-red-50 rounded-md transition-colors mt-2"
                      >
                        Log out
                      </button>
                      <RouterLink 
                        to="/admin/instances"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center px-2 py-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground mt-4"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Instance Management
                      </RouterLink>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
