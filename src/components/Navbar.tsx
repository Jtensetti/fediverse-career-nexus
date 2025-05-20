import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
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
import { AlignJustify, User } from "lucide-react";

const Navbar = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = [
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
      name: t("nav.moderation", "Moderation"),
      href: "/moderation",
    }
  ];

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="container mx-auto flex w-full items-center justify-between">
          <div className="flex items-center gap-4">
            <RouterLink to="/" className="font-bold">
              {t("appTitle", "My App")}
            </RouterLink>
            <nav className="mx-6 hidden w-full space-x-4 md:flex">
              {navigationItems.map((item) => (
                <RouterLink key={item.href} to={item.href}>
                  {item.name}
                </RouterLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-avatar.jpg" alt="Avatar" />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <RouterLink to="/profile">
                    {t("nav.profile", "Profile")}
                  </RouterLink>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <RouterLink to="/profile/edit">
                    {t("common.edit", "Edit")} {t("nav.profile", "Profile")}
                  </RouterLink>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {t("auth.logout", "Log out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <AlignJustify className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle>{t("appTitle", "My App")}</SheetTitle>
                  <SheetDescription>
                    {t("accessibility.navigationMenu", "Navigation menu")}
                  </SheetDescription>
                </SheetHeader>
                <nav className="grid gap-6 text-lg">
                  {navigationItems.map((item) => (
                    <RouterLink key={item.href} to={item.href}>
                      {item.name}
                    </RouterLink>
                  ))}
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
