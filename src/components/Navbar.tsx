
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { setTheme, theme } = useTheme();
  const { toast } = useToast();
  const supabaseClient = useSupabaseClient();
  const session = useSession();
  const { t } = useTranslation();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    toast({
      title: "Signed out",
      description: "See you soon!",
    });
  };

  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <Link to="/" className="flex items-center font-semibold">
          Bondy
        </Link>

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link to="/" className={navigationMenuTriggerStyle()}>
                {t('nav.home')}
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link to="/connections" className={navigationMenuTriggerStyle()}>
                {t('nav.connections')}
              </Link>
            </NavigationMenuItem>
            
            <NavigationMenuItem>
              <Link to="/articles" className={navigationMenuTriggerStyle()}>
                {t('nav.articles')}
              </Link>
            </NavigationMenuItem>

            {session ? (
              <NavigationMenuItem>
                <Link
                  to="/profile/edit"
                  className={navigationMenuTriggerStyle()}
                >
                  {t('nav.editProfile')}
                </Link>
              </NavigationMenuItem>
            ) : null}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center space-x-2 md:space-x-4">
          <LanguageSwitcher />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setTheme((prev: string) => (prev === "light" ? "dark" : "light"))
            }
            aria-label={t('accessibility.darkMode')}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{t('accessibility.darkMode')}</span>
          </Button>

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-8 w-8 rounded-full"
                  aria-label={t('accessibility.profileMenu')}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user?.user_metadata?.avatar_url as string} alt={session?.user?.user_metadata?.full_name as string} />
                    <AvatarFallback>{(session?.user?.user_metadata?.full_name as string)?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = `/profile/${session?.user?.user_metadata?.username}`}>{t('profile.title')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = "/profile/edit"}>{t('profile.edit')}</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  {t('nav.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login">
              <Button variant="outline" size="sm">
                {t('nav.signIn')}
              </Button>
            </Link>
          )}

          <Button
            variant="outline"
            size="icon"
            className={cn("ml-2 flex md:hidden")}
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? t('accessibility.menuClose') : t('accessibility.menuOpen')}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
            <span className="sr-only">
              {isMobileMenuOpen ? t('accessibility.menuClose') : t('accessibility.menuOpen')}
            </span>
          </Button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b z-50 md:hidden" role="dialog" aria-modal="true">
          <nav className="container flex flex-col py-4">
            <Link
              to="/"
              className="px-4 py-2 hover:bg-accent rounded-md"
              onClick={closeMobileMenu}
            >
              {t('nav.home')}
            </Link>
            <Link
              to="/connections"
              className="px-4 py-2 hover:bg-accent rounded-md"
              onClick={closeMobileMenu}
            >
              {t('nav.connections')}
            </Link>
            <Link
              to="/articles"
              className="px-4 py-2 hover:bg-accent rounded-md"
              onClick={closeMobileMenu}
            >
              {t('nav.articles')}
            </Link>
            {session ? (
              <>
                <Link
                  to="/profile/edit"
                  className="px-4 py-2 hover:bg-accent rounded-md"
                  onClick={closeMobileMenu}
                >
                  {t('nav.editProfile')}
                </Link>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleSignOut}>
                  {t('nav.signOut')}
                </Button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 hover:bg-accent rounded-md"
                onClick={closeMobileMenu}
              >
                {t('nav.signIn')}
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
