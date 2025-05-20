import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
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

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const supabaseClient = useSupabaseClient();
  const session = useSession();

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
                Home
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link to="/connections" className={navigationMenuTriggerStyle()}>
                Connections
              </Link>
            </NavigationMenuItem>
            
            <NavigationMenuItem>
              <Link to="/articles" className={navigationMenuTriggerStyle()}>
                Articles
              </Link>
            </NavigationMenuItem>

            {session ? (
              <NavigationMenuItem>
                <Link
                  to="/profile/edit"
                  className={navigationMenuTriggerStyle()}
                >
                  Edit Profile
                </Link>
              </NavigationMenuItem>
            ) : null}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center space-x-2 md:space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setTheme((prev: string) => (prev === "light" ? "dark" : "light"))
            }
          >
            <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user?.user_metadata?.avatar_url as string} alt={session?.user?.user_metadata?.full_name as string} />
                    <AvatarFallback>{(session?.user?.user_metadata?.full_name as string)?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = `/profile/${session?.user?.user_metadata?.username}`}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = "/profile/edit"}>Edit Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
          )}

          <Button
            variant="outline"
            size="icon"
            className={cn("ml-2 flex md:hidden")}
            onClick={toggleMobileMenu}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b z-50 md:hidden">
          <nav className="container flex flex-col py-4">
            <Link
              to="/"
              className="px-4 py-2 hover:bg-accent rounded-md"
              onClick={closeMobileMenu}
            >
              Home
            </Link>
            <Link
              to="/connections"
              className="px-4 py-2 hover:bg-accent rounded-md"
              onClick={closeMobileMenu}
            >
              Connections
            </Link>
            <Link
              to="/articles"
              className="px-4 py-2 hover:bg-accent rounded-md"
              onClick={closeMobileMenu}
            >
              Articles
            </Link>
            {session ? (
              <>
                <Link
                  to="/profile/edit"
                  className="px-4 py-2 hover:bg-accent rounded-md"
                  onClick={closeMobileMenu}
                >
                  Edit Profile
                </Link>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 hover:bg-accent rounded-md"
                onClick={closeMobileMenu}
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
