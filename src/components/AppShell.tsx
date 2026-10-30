import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, FileText, LayoutDashboard, LogOut, Menu, PenSquare, Shield, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { useI18n, type TKey } from "@/lib/i18n";
import { BrandLogo } from "./Brand";
import { LanguageSwitch } from "./LanguageSwitch";
import { Loading } from "./States";
import { cn } from "@/lib/utils";

type NavItem = { to: "/dashboard" | "/subjects" | "/exams" | "/teacher" | "/admin" | "/profile"; key: TKey; icon: typeof BookOpen };

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const needsOnboarding = !!me && !me.profile?.onboarded && !me.isAdmin;
  useEffect(() => {
    if (needsOnboarding && location.pathname !== "/onboarding") navigate({ to: "/onboarding", replace: true });
  }, [needsOnboarding, location.pathname, navigate]);
  useEffect(() => setOpen(false), [location.pathname]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const items: NavItem[] = [];
  if (me?.isStudent || me?.isAdmin) {
    items.push({ to: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard });
    items.push({ to: "/subjects", key: "nav.subjects", icon: BookOpen });
    items.push({ to: "/exams", key: "nav.exams", icon: FileText });
  }
  if (me?.isTeacher || me?.isAdmin) items.push({ to: "/teacher", key: "nav.teacher", icon: PenSquare });
  if (me?.isAdmin) items.push({ to: "/admin", key: "nav.admin", icon: Shield });
  items.push({ to: "/profile", key: "nav.profile", icon: User });

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
        >
          <i.icon className="h-4 w-4" /> {t(i.key)}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-6 bg-sidebar p-5 transition-transform lg:static lg:w-auto lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2">
          <Link to="/" aria-label="EXAMPRO">
            <BrandLogo className="h-8" />
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        {nav}
        <div className="mt-auto flex flex-col gap-3">
          <LanguageSwitch tone="light" />
          <button onClick={signOut} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4" /> {t("nav.logout")}
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-primary/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Menu" className="rounded-md p-1.5 hover:bg-muted">
            <Menu className="h-5 w-5" />
          </button>
          <BrandLogo className="h-7" />
          <LanguageSwitch />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{isLoading ? <Loading /> : children}</main>
      </div>
    </div>
  );
}
