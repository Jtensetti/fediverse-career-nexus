import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./ModeToggle";
import LanguageSelector from "@/components/common/LanguageSelector";

export default function PublicNavbar() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const returnTo = { returnTo: pathname === "/" ? "/feed" : pathname + search };
  const links = [
    { to: "/feed", label: t("ui.publicNavbar.explore") },
    { to: "/jobs", label: t("ui.publicNavbar.jobs") },
    { to: "/federation", label: t("ui.publicNavbar.anOpenNetwork") },
    { to: "/hosting", label: t("ui.publicNavbar.selfhosting") },
  ];

  return <header className="public-header border-b border-border/60 bg-background">
    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
      <Link to="/" aria-label={t("ui.publicNavbar.noltoHome")} className="flex shrink-0 items-center gap-2.5">
        <img src="/brand/mascot.webp" alt="" width="38" height="38" className="h-[38px] w-[38px] object-contain" />
        <span className="font-display text-2xl font-bold tracking-tight text-primary">Nolto</span>
      </Link>
      <nav aria-label={t("ui.publicNavbar.mainNavigation")} className="hidden items-center gap-7 lg:flex">
        {links.map(link => <NavLink key={link.to} to={link.to} className={({ isActive }) => `text-sm font-medium underline-offset-8 hover:underline ${isActive ? "text-primary underline" : "text-muted-foreground"}`}>{link.label}</NavLink>)}
      </nav>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden sm:block"><ModeToggle /></div>
        <LanguageSelector compact className="hidden sm:flex" />
        <Link to="/auth" state={returnTo} className="min-h-11 content-center text-sm font-medium hover:underline">{t("ui.publicNavbar.signIn")}</Link>
        <Button asChild className="hidden rounded-full px-5 sm:inline-flex"><Link to="/auth/signup" state={returnTo}>{t("ui.publicNavbar.joinNolto")}<ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></Button>
        <details key={pathname} className="group relative lg:hidden">
          <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border [&::-webkit-details-marker]:hidden" aria-label={t("ui.publicNavbar.openMenu")}><Menu className="h-5 w-5" /></summary>
          <nav aria-label={t("ui.publicNavbar.mobileNavigation")} className="absolute right-0 top-14 z-50 w-64 rounded-xl border bg-background p-3 shadow-xl">
            {links.map(link => <Link key={link.to} to={link.to} className="block rounded-lg px-4 py-3 text-sm hover:bg-muted">{link.label}</Link>)}
            <Link to="/auth/signup" state={returnTo} className="mt-2 block rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">{t("ui.publicNavbar.createAccount")}</Link>
            <div className="px-2 py-2"><LanguageSelector className="w-full" /></div>
            <div className="border-t px-2 pt-2 sm:hidden"><ModeToggle /></div>
          </nav>
        </details>
      </div>
    </div>
  </header>;
}
