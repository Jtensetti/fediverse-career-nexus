import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ModeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { MobileSearch } from "./MobileSearch";
import { NotificationBell } from "./NotificationBell";
import { AlignJustify, LogIn, Settings, User, UserPlus, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isHomePage = location.pathname === "/";
  const isAuthenticated = !!user;

  // Fetch user profile for avatar
  const { data: userProfile } = useQuery({
    queryKey: ['navbarProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('public_profiles')
        .select('avatar_url, fullname, username')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

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
    staleTime: 5 * 60 * 1000,
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
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrolled]);

  const authenticatedNavigationItems = [
    { name: t("nav.feed", "Feed"), href: "/feed" },
    { name: t("nav.connections", "Connections"), href: "/connections" },
    { name: t("nav.articles", "Articles"), href: "/articles" },
    { name: t("nav.jobs", "Jobs"), href: "/jobs" },
    { name: t("nav.events", "Events"), href: "/events" },
    { name: t("nav.messages", "Messages"), href: "/messages" },
  ];

  const isActiveRoute = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  if (authLoading) {
    return (
      <div className={cn(
        "transition-all duration-300",
        isHomePage ? 'absolute top-0 left-0 right-0 z-50' : 'border-b',
        scrolled && isHomePage ? 'bg-background/80 backdrop-blur-lg shadow-sm' : isHomePage ? 'bg-transparent' : 'bg-background'
      )}>
        <div className="flex h-16 items-center px-4">
          <div className="container mx-auto flex w-full items-center justify-between">
            <RouterLink to="/" className={cn(
              "font-bold text-xl flex items-center gap-2 transition-colors",
              isHomePage && !scrolled ? 'text-primary-foreground' : 'text-primary'
            )}>
              <img 
                src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                alt="Nolto" 
                className="w-8 h-8" 
              />
              <span className="font-display">Nolto</span>
            </RouterLink>
            <div className="flex items-center gap-4">
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={false}
      animate={{ 
        backgroundColor: scrolled && isHomePage ? 'hsl(var(--background) / 0.8)' : isHomePage ? 'transparent' : 'hsl(var(--background))'
      }}
      className={cn(
        "transition-all duration-300",
        isHomePage ? 'absolute top-0 left-0 right-0 z-50' : 'border-b sticky top-0 z-50',
        scrolled && 'backdrop-blur-lg shadow-sm'
      )}
    >
      <div className="flex h-16 items-center px-4">
        <div className="container mx-auto flex w-full items-center justify-between">
          <div className="flex items-center gap-4">
            <RouterLink to="/" className={cn(
              "font-bold text-xl flex items-center gap-2 transition-colors",
              isHomePage && !scrolled ? 'text-primary-foreground' : 'text-primary'
            )}>
              <motion.img 
                src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                alt="Nolto" 
                className="w-8 h-8"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              />
              <span className="font-display">Nolto</span>
            </RouterLink>
            
            {isAuthenticated && (
              <nav className={cn(
                "mx-6 hidden lg:flex items-center gap-1",
                isHomePage && !scrolled ? 'text-primary-foreground' : 'text-foreground'
              )}>
                {authenticatedNavigationItems.map((item) => (
                  <RouterLink 
                    key={item.href} 
                    to={item.href}
                    className={cn(
                      "relative px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActiveRoute(item.href) 
                        ? "text-primary bg-primary/10" 
                        : "hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.name}
                    {isActiveRoute(item.href) && (
                      <motion.div
                        layoutId="navIndicator"
                        className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </RouterLink>
                ))}
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {isAuthenticated && <MobileSearch />}
            {isAuthenticated && (
              <div className="hidden md:block">
                <GlobalSearch />
              </div>
            )}
            
            {isAuthenticated && <NotificationBell />}
            
            <div className="hidden sm:flex items-center gap-1">
              <ModeToggle />
            </div>
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 p-0 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={userProfile?.avatar_url || ''} alt={userProfile?.fullname || 'Avatar'} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                        {userProfile?.fullname?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2" sideOffset={8}>
                  {/* Profile Preview */}
                  <div className="flex items-center gap-3 p-2 mb-2">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={userProfile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {userProfile?.fullname?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{userProfile?.fullname || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">@{userProfile?.username || user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                    <RouterLink to="/profile" className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t("nav.profile", "View Profile")}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </RouterLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                    <RouterLink to="/profile/edit" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      {t("common.settings", "Settings")}
                    </RouterLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                    <RouterLink to="/moderation" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      {t("nav.moderation", "Moderation")}
                    </RouterLink>
                  </DropdownMenuItem>
                  {isAdminOrModerator && (
                    <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                      <RouterLink to="/admin/instances" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Instance Management
                      </RouterLink>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="cursor-pointer py-2.5 text-destructive hover:text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("auth.logout", "Log out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button 
                  asChild 
                  variant="ghost" 
                  size="sm"
                  className={cn(
                    "font-medium",
                    isHomePage && !scrolled ? 'text-primary-foreground hover:bg-primary-foreground/10' : ''
                  )}
                >
                  <RouterLink to="/auth/login">
                    {t("auth.signIn", "Sign In")}
                  </RouterLink>
                </Button>
                <Button 
                  asChild 
                  size="sm" 
                  className={cn(
                    "font-medium",
                    isHomePage && !scrolled 
                      ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" 
                      : ""
                  )}
                >
                  <RouterLink to="/auth/signup">
                    {t("auth.signUp", "Get Started")}
                  </RouterLink>
                </Button>
              </div>
            )}
            
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "lg:hidden",
                    isHomePage && !scrolled ? 'text-primary-foreground' : ''
                  )}
                >
                  <AlignJustify className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-6 border-b">
                  <SheetTitle>
                    <div className="flex items-center gap-2">
                      <img 
                        src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                        alt="Nolto" 
                        className="w-8 h-8" 
                      />
                      <span className="font-display text-xl">Nolto</span>
                    </div>
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    {t("accessibility.navigationMenu", "Navigation menu")}
                  </SheetDescription>
                </SheetHeader>
                
                <nav className="flex flex-col p-4">
                  {isAuthenticated ? (
                    <>
                      {/* User Profile Section */}
                      <RouterLink 
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors mb-4"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={userProfile?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {userProfile?.fullname?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{userProfile?.fullname || 'User'}</p>
                          <p className="text-sm text-muted-foreground truncate">{t("nav.viewProfile", "View your profile")}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </RouterLink>
                      
                      <div className="space-y-1">
                        {authenticatedNavigationItems.map((item) => (
                          <RouterLink 
                            key={item.href} 
                            to={item.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "flex items-center px-4 py-3 rounded-lg transition-colors font-medium",
                              isActiveRoute(item.href) 
                                ? "bg-primary/10 text-primary" 
                                : "hover:bg-muted"
                            )}
                          >
                            {item.name}
                          </RouterLink>
                        ))}
                      </div>
                      
                      <div className="border-t mt-4 pt-4">
                        <RouterLink 
                          to="/profile/edit"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Settings className="h-5 w-5" />
                          {t("common.settings", "Settings")}
                        </RouterLink>
                        {isAdminOrModerator && (
                          <RouterLink 
                            to="/admin/instances"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                          >
                            <Settings className="h-5 w-5" />
                            {t("nav.instanceManagement", "Instance Management")}
                          </RouterLink>
                        )}
                        <button 
                          onClick={() => {
                            handleLogout();
                            setIsOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors mt-2"
                        >
                          <LogOut className="h-5 w-5" />
                          {t("auth.logout", "Log out")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1 mb-6">
                        <RouterLink 
                          to="/jobs"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center px-4 py-3 rounded-lg hover:bg-muted transition-colors font-medium"
                        >
                          {t("nav.jobs", "Jobs")}
                        </RouterLink>
                        <RouterLink 
                          to="/federation"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center px-4 py-3 rounded-lg hover:bg-muted transition-colors font-medium"
                        >
                          {t("footer.howFederationWorks", "How Federation Works")}
                        </RouterLink>
                        <RouterLink 
                          to="/mission"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center px-4 py-3 rounded-lg hover:bg-muted transition-colors font-medium"
                        >
                          {t("footer.ourMission", "Our Mission")}
                        </RouterLink>
                      </div>
                      
                      <div className="space-y-3 mt-auto">
                        <Button asChild className="w-full" size="lg">
                          <RouterLink to="/auth/signup" onClick={() => setIsOpen(false)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            {t("auth.signUp", "Create Account")}
                          </RouterLink>
                        </Button>
                        <Button asChild variant="outline" className="w-full" size="lg">
                          <RouterLink to="/auth/login" onClick={() => setIsOpen(false)}>
                            <LogIn className="h-4 w-4 mr-2" />
                            {t("auth.signIn", "Sign In")}
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
    </motion.div>
  );
};

export default Navbar;
