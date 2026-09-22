import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./ModeToggle";

export default function PublicNavbar() {
  const { i18n } = useTranslation();
  const { pathname, search } = useLocation();
  const sv = i18n.language.startsWith("sv");
  const returnTo = { returnTo: pathname === "/" ? "/feed" : pathname + search };
  const links = [
    { to: "/feed", label: sv ? "Utforska" : "Explore" },
    { to: "/jobs", label: sv ? "Jobb" : "Jobs" },
    { to: "/federation", label: sv ? "Ett öppet nätverk" : "An open network" },
    { to: "/hosting", label: sv ? "Egen drift" : "Self-hosting" },
  ];

  return <header className="public-header border-b border-border/60 bg-background">
    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
      <Link to="/" aria-label={sv ? "Nolto – startsida" : "Nolto – home"} className="flex shrink-0 items-center gap-2.5">
        <img src="/brand/mascot.webp" alt="" width="38" height="38" className="h-[38px] w-[38px] object-contain" />
        <span className="font-display text-2xl font-bold tracking-tight text-primary">Nolto</span>
      </Link>
      <nav aria-label={sv ? "Huvudmeny" : "Main navigation"} className="hidden items-center gap-7 lg:flex">
        {links.map(link => <NavLink key={link.to} to={link.to} className={({ isActive }) => `text-sm font-medium underline-offset-8 hover:underline ${isActive ? "text-primary underline" : "text-muted-foreground"}`}>{link.label}</NavLink>)}
      </nav>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden sm:block"><ModeToggle /></div>
        <button onClick={() => void i18n.changeLanguage(sv ? "en" : "sv")} className="hidden min-h-11 px-2 text-xs font-semibold sm:block" aria-label={sv ? "Switch to English" : "Byt till svenska"}>{sv ? "EN" : "SV"}</button>
        <Link to="/auth" state={returnTo} className="min-h-11 content-center text-sm font-medium hover:underline">{sv ? "Logga in" : "Sign in"}</Link>
        <Button asChild className="hidden rounded-full px-5 sm:inline-flex"><Link to="/auth/signup" state={returnTo}>{sv ? "Gå med" : "Join Nolto"}<ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></Button>
        <details key={pathname} className="group relative lg:hidden">
          <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border [&::-webkit-details-marker]:hidden" aria-label={sv ? "Öppna menyn" : "Open menu"}><Menu className="h-5 w-5" /></summary>
          <nav aria-label={sv ? "Mobilmeny" : "Mobile navigation"} className="absolute right-0 top-14 z-50 w-64 rounded-xl border bg-background p-3 shadow-xl">
            {links.map(link => <Link key={link.to} to={link.to} className="block rounded-lg px-4 py-3 text-sm hover:bg-muted">{link.label}</Link>)}
            <Link to="/auth/signup" state={returnTo} className="mt-2 block rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">{sv ? "Skapa konto" : "Create account"}</Link>
            <button onClick={() => void i18n.changeLanguage(sv ? "en" : "sv")} className="w-full px-4 py-3 text-left text-sm">{sv ? "English" : "Svenska"}</button>
            <div className="border-t px-2 pt-2 sm:hidden"><ModeToggle /></div>
          </nav>
        </details>
      </div>
    </div>
  </header>;
}
