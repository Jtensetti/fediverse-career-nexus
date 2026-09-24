import { UnsavedChangesContext } from "@/contexts/UnsavedChangesContext";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, Settings, UserRound, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useModerationAccess } from "@/hooks/useModerationAccess";
import { supabase } from "@/lib/supabase";
import { ModeToggle } from "./ModeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { MobileSearch } from "./MobileSearch";
import { NotificationBell } from "./NotificationBell";
import LanguageSelector from "@/components/common/LanguageSelector";
import PublicNavbar from "./PublicNavbar";

export default function Navbar() {
  const { user } = useAuth();
  return user ? <MemberNavbar /> : <PublicNavbar />;
}

function MemberNavbar() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const unsaved = useContext(UnsavedChangesContext);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { hasAccess } = useModerationAccess();
  const { data: profile } = useQuery({
    queryKey: ["navbarProfile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("public_profiles").select("avatar_url, fullname, username").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 300_000,
  });
  const links = [
    { to: "/feed", label: t("nav.feed") },
    { to: "/connections", label: t("nav.connections") },
    { to: "/articles", label: t("nav.articles") },
    { to: "/jobs", label: t("nav.jobs") },
    { to: "/organisationer", label: t("nav.companies") },
    { to: "/events", label: t("nav.events") },
    { to: "/messages", label: t("nav.messages") },
  ];
  const logout = async () => {
    if (unsaved?.hasChanges() && !window.confirm(t("ux.leaveDescription"))) return;
    try {
      await signOut();
      toast.success(t("toasts.loggedOut"));
      navigate("/");
    } catch { toast.error(t("toasts.logoutError")); }
  };
  const avatar = <Avatar className="h-9 w-9">
    <AvatarImage src={profile?.avatar_url || undefined} alt="" />
    <AvatarFallback>{(profile?.fullname || profile?.username || "N").charAt(0).toUpperCase()}</AvatarFallback>
  </Avatar>;

  return <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4">
      <Link to="/feed" className="flex items-center gap-2 text-primary"><img src="/brand/mascot.webp" width="32" height="32" alt="" className="h-8 w-8 object-contain" /><span className="font-display text-xl font-bold">Nolto</span></Link>
      <nav className="hidden items-center gap-1 xl:flex" aria-label={t("accessibility.navigationMenu")}>
        {links.map(link => <NavLink key={link.to} to={link.to} className={({ isActive }) => `inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>{link.label}</NavLink>)}
      </nav>
      <div className="flex items-center gap-2">
        <MobileSearch />
        <div className="hidden md:block"><GlobalSearch /></div>
        <LanguageSelector compact className="hidden sm:flex" />
        <NotificationBell />
        <div className="hidden sm:block"><ModeToggle /></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full" aria-label={t("nav.profile")}>{avatar}</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="px-2 py-3"><p className="truncate text-sm font-semibold">{profile?.fullname || profile?.username}</p><p className="truncate text-xs text-muted-foreground">@{profile?.username}</p></div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/profile"><UserRound className="mr-2 h-4 w-4" />{t("nav.profile")}</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/profile/edit"><Settings className="mr-2 h-4 w-4" />{t("common.settings")}</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/my-reviews">{t("contentCare.myReviews")}</Link></DropdownMenuItem>
            {hasAccess && <><DropdownMenuItem asChild><Link to="/moderation">{t("nav.moderation")}</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/admin/instances">{t("nav.instanceManagement")}</Link></DropdownMenuItem></>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void logout()} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />{t("auth.logout")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><Button variant="ghost" size="icon" className="xl:hidden" aria-label={t("accessibility.navigationMenu")}><Menu className="h-5 w-5" /></Button></SheetTrigger>
          <SheetContent side="left" className="w-80 max-w-[100vw] overflow-y-auto" onOpenAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>('[data-member-navigation] a')?.focus());
          }}>
            <SheetHeader><SheetTitle>Nolto</SheetTitle><SheetDescription className="sr-only">{t("accessibility.navigationMenu")}</SheetDescription></SheetHeader>
            <nav data-member-navigation className="mt-6 flex flex-col gap-1" aria-label={t("accessibility.navigationMenu")}>
              {links.map(link => <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className={({ isActive }) => `rounded-lg px-4 py-3 text-sm ${isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>{link.label}</NavLink>)}
              <Link to="/profile/edit" onClick={() => setOpen(false)} className="mt-3 border-t px-4 py-3 text-sm">{t("common.settings")}</Link>
              <Link to="/my-reviews" onClick={() => setOpen(false)} className="px-4 py-3 text-sm">{t("contentCare.myReviews")}</Link>
              <button onClick={() => void logout()} className="px-4 py-3 text-left text-sm text-destructive">{t("auth.logout")}</button>
            </nav>
            <div className="mt-4 flex flex-wrap items-center gap-3"><LanguageSelector /><ModeToggle /></div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </header>;
}
