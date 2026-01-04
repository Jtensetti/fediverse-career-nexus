import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
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
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { AlignJustify, LogIn, Settings, User, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Navbar = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isHomePage = location.pathname === "/";
  const isAuthenticated = !!user;

  // Check if user is admin or moderator
  const { data: isAdminOrModerator } = useQuery({
    queryKey: ['isAdminOrModerator', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('is_moderator', { _user_id: user.id });
      if (error) return false;
      return data === true;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Successfully logged out");
      navigate("/");
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
    { name: t("nav.profile", "Profile"), href: "/profile" },
    { name: t("nav.connections", "Connections"), href: "/connections" },
    { name: t("nav.articles", "Articles"), href: "/articles" },
    { name: t("nav.jobs", "Jobs"), href: "/jobs" },
    { name: t("nav.events", "Events"), href: "/events" },
    { name: t("nav.messages", "Messages"), href: "/messages" },
    { name: t("nav.feed", "Feed"), href: "/feed" },
  ];

  if (authLoading) {
    return (
      <div className={`${isHomePage ? 'absolute top-0 left-0 right-0 z-50' : 'border-b'} transition-colors duration-300 ${scrolled && isHomePage ? 'bg-background/90 backdrop-blur-md shadow-sm' : isHomePage ? 'bg-transparent' : 'bg-background'}`}>
        <div className="flex h-16 items-center px-4">
          <div className="container mx-auto flex w-full items-center justify-between">
            <RouterLink to="/" className={`font-bold text-xl flex items-center gap-2 ${isHomePage && !scrolled ? 'text-primary-foreground' : 'text-primary'}`}>
              <img 
                src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                alt="Nolto" 
                className="w-8 h-8" 
              />
              <span className="font-display">Nolto</span>
            </RouterLink>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isHomePage ? 'absolute top-0 left-0 right-0 z-50' : 'border-b'} transition-colors duration-300 ${scrolled && isHomePage ? 'bg-background/90 backdrop-blur-md shadow-sm' : isHomePage ? 'bg-transparent' : 'bg-background'}`}>
      <div className="flex h-16 items-center px-4">
        <div className="container mx-auto flex w-full items-center justify-between">
          <div className="flex items-center gap-4">
            <RouterLink to="/" className={`font-bold text-xl flex items-center gap-2 ${isHomePage && !scrolled ? 'text-primary-foreground' : 'text-primary'}`}>
              <img 
                src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                alt="Nolto" 
                className="w-8 h-8" 
              />
              <span className="font-display">Nolto</span>
            </RouterLink>
            
            {isAuthenticated && (
              <nav className={`mx-6 hidden md:flex space-x-6 ${isHomePage && !scrolled ? 'text-primary-foreground' : 'text-foreground'}`}>
                {authenticatedNavigationItems.map((item) => (
                  <RouterLink 
                    key={item.href} 
                    to={item.href}
                    className="font-medium hover:text-secondary transition-colors"
                  >
                    {item.name}
                  </RouterLink>
                ))}
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {isAuthenticated && (
              <div className="hidden md:block">
                <GlobalSearch />
              </div>
            )}
            
            {isAuthenticated && <NotificationBell />}
            
            <LanguageSwitcher />
            <ModeToggle />
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt="Avatar" />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm font-medium text-center border-b">
                    {user?.email}
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
                  {isAdminOrModerator && (
                    <DropdownMenuItem asChild>
                      <RouterLink to="/admin/instances" className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Instance Management
                      </RouterLink>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive hover:text-destructive focus:bg-destructive/10">
                    {t("auth.logout", "Log out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex space-x-2">
                <Button 
                  asChild 
                  variant="ghost" 
                  size="sm"
                  className={`${isHomePage && !scrolled ? 'text-primary-foreground hover:bg-primary-foreground/10' : 'hover:bg-muted'}`}
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
                    "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : 
                    "bg-primary text-primary-foreground hover:bg-primary/90"
                  }
                >
                  <RouterLink to="/auth/signup">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </RouterLink>
                </Button>
              </div>
            )}
            
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className={`md:hidden ${isHomePage && !scrolled ? 'text-primary-foreground' : ''}`}>
                  <AlignJustify className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle>
                    <div className="flex items-center gap-2">
                      <img 
                        src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                        alt="Nolto" 
                        className="w-6 h-6" 
                      />
                      <span className="font-display">Nolto</span>
                    </div>
                  </SheetTitle>
                  <SheetDescription>
                    {t("accessibility.navigationMenu", "Navigation menu")}
                  </SheetDescription>
                </SheetHeader>
                <nav className="grid gap-4 text-lg mt-6">
                  {isAuthenticated ? (
                    <>
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
                          className="flex items-center px-2 py-1 text-destructive w-full text-left hover:bg-destructive/10 rounded-md transition-colors mt-2"
                        >
                          Log out
                        </button>
                        {isAdminOrModerator && (
                          <RouterLink 
                            to="/admin/instances"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center px-2 py-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground mt-4"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Instance Management
                          </RouterLink>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <RouterLink 
                        to="/jobs"
                        onClick={() => setIsOpen(false)}
                        className="px-2 py-1 hover:bg-muted rounded-md transition-colors"
                      >
                        Jobs
                      </RouterLink>
                      <RouterLink 
                        to="/federation"
                        onClick={() => setIsOpen(false)}
                        className="px-2 py-1 hover:bg-muted rounded-md transition-colors"
                      >
                        How Federation Works
                      </RouterLink>
                      <RouterLink 
                        to="/mission"
                        onClick={() => setIsOpen(false)}
                        className="px-2 py-1 hover:bg-muted rounded-md transition-colors"
                      >
                        Our Mission
                      </RouterLink>
                      <div className="border-t pt-4 mt-4 space-y-3">
                        <Button asChild className="w-full">
                          <RouterLink to="/auth/signup" onClick={() => setIsOpen(false)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create Account
                          </RouterLink>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                          <RouterLink to="/auth/login" onClick={() => setIsOpen(false)}>
                            <LogIn className="h-4 w-4 mr-2" />
                            Sign In
                          </RouterLink>
                        </Button>
                      </div>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
