import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Archive,
  BarChart3,
  Bell,
  Bookmark,
  BookOpen,
  Bot,
  CircleHelp,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackFilter } from "@/lib/catalog";
import { openExamFile } from "@/lib/files";
import { formatExamYear } from "@/lib/exam-years";
import { useMe } from "@/lib/session";
import { useI18n, type TKey } from "@/lib/i18n";
import { BrandIcon, BrandLogo } from "./Brand";
import { LanguageSwitch } from "./LanguageSwitch";
import { ErrorState, Loading } from "./States";
import { cn } from "@/lib/utils";

type NavItem = {
  to:
    | "/dashboard"
    | "/subjects"
    | "/courses"
    | "/exams"
    | "/favorites"
    | "/evaluations"
    | "/progress"
    | "/teacher"
    | "/admin"
    | "/teacher/exams"
    | "/teacher/courses"
    | "/admin/exams"
    | "/admin/courses"
    | "/admin/users"
    | "/profile";
  key: TKey;
  icon: typeof BookOpen;
};

function StudentSearch({ levelId, trackId }: { levelId: string | null; trackId: string | null }) {
  const { t, errMsg } = useI18n();
  const [value, setValue] = useState("");
  const [term, setTerm] = useState("");
  const [focused, setFocused] = useState(false);
  const [busyExam, setBusyExam] = useState<string | null>(null);
  const searchContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(value.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [value]);
  useEffect(() => {
    if (!focused) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchContainer.current?.contains(event.target)) {
        setFocused(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [focused]);

  const results = useQuery({
    queryKey: ["student-header-search", levelId, trackId, term],
    enabled: !!levelId && term.length >= 2,
    queryFn: async () => {
      const filter = trackFilter(trackId);
      const [courseResult, examResult] = await Promise.all([
        supabase
          .from("courses")
          .select("id,title,subject_id")
          .eq("status", "published")
          .eq("level_id", levelId!)
          .or(filter)
          .ilike("title", `%${term}%`)
          .order("published_at", { ascending: false })
          .limit(5),
        supabase
          .from("exams")
          .select("id,title,subject_id,exam_year,file_path,demo_content")
          .eq("status", "published")
          .eq("level_id", levelId!)
          .or(filter)
          .ilike("title", `%${term}%`)
          .order("exam_year", { ascending: false })
          .limit(5),
      ]);
      if (courseResult.error) throw courseResult.error;
      if (examResult.error) throw examResult.error;
      return { courses: courseResult.data, exams: examResult.data };
    },
  });

  async function openExam(path: string, id: string, demoContent: string | null) {
    setBusyExam(id);
    try {
      await openExamFile(path, demoContent);
      setFocused(false);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusyExam(null);
    }
  }

  const hasResults = !!results.data?.courses.length || !!results.data?.exams.length;
  const quizSearch = /quiz|quizzes|egzamen pratik/i.test(term);

  return (
    <div ref={searchContainer} className="relative min-w-0 flex-1">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setTerm(value.trim());
          setFocused(true);
        }}
        className="flex h-10 items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 text-muted-foreground focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20"
      >
        <Search className="h-4 w-4 shrink-0" />
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setFocused(false);
          }}
          aria-label={t("dash.search")}
          placeholder={t("dash.searchPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {value && (
          <button
            type="button"
            aria-label={t("common.clear")}
            onClick={() => {
              setValue("");
              setTerm("");
            }}
            className="rounded p-1 hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {focused && term.length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-40 max-h-[min(70vh,28rem)] overflow-y-auto rounded-xl border bg-card p-2 shadow-xl sm:min-w-[26rem]">
          {results.isLoading || term !== value.trim() ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : results.error ? (
            <ErrorState error={results.error} onRetry={() => void results.refetch()} />
          ) : hasResults ? (
            <div className="space-y-1">
              {results.data?.courses.map((course) => (
                <Link
                  key={`course-${course.id}`}
                  to="/courses/$courseId"
                  params={{ courseId: course.id }}
                  onClick={() => setFocused(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted"
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-deep" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">
                    {course.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{t("dash.courseResult")}</span>
                </Link>
              ))}
              {results.data?.exams.map((exam) => (
                <button
                  key={`exam-${exam.id}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void openExam(exam.file_path, exam.id, exam.demo_content)}
                  disabled={busyExam === exam.id}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted disabled:opacity-60"
                >
                  <FileText className="h-4 w-4 shrink-0 text-deep" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">
                    {exam.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {busyExam === exam.id ? t("common.loading") : t("dash.examResult")}
                    {" · "}
                    {formatExamYear(exam.exam_year)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              {quizSearch ? t("dash.searchQuizUnavailable") : t("dash.noSearchResults")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AppShell({
  children,
  onboardingOnly = false,
}: {
  children: ReactNode;
  onboardingOnly?: boolean;
}) {
  const { data: me, isLoading } = useMe();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const needsOnboarding = !!me && !me.profile?.onboarded && !me.isAdmin;
  useEffect(() => {
    if (needsOnboarding && location.pathname !== "/onboarding")
      navigate({ to: "/onboarding", replace: true });
  }, [needsOnboarding, location.pathname, navigate]);
  useEffect(() => setOpen(false), [location.pathname]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isStudent = !!me?.isStudent && !me.isTeacher && !me.isAdmin;
  const items: NavItem[] = [];
  if (me?.isAdmin) {
    items.push({ to: "/admin", key: "nav.dashboard", icon: LayoutDashboard });
    items.push({ to: "/admin/exams", key: "nav.adminExams", icon: FileText });
    items.push({ to: "/admin/courses", key: "nav.adminCourses", icon: BookOpen });
    items.push({ to: "/admin/users", key: "nav.adminUsers", icon: User });
  } else if (me?.isTeacher) {
    items.push({ to: "/teacher", key: "nav.dashboard", icon: LayoutDashboard });
    items.push({ to: "/teacher/exams", key: "nav.teacherExams", icon: FileText });
    items.push({ to: "/teacher/courses", key: "nav.teacherCourses", icon: BookOpen });
  } else if (me?.isStudent) {
    items.push({ to: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard });
    items.push({ to: "/subjects", key: "nav.subjects", icon: BookOpen });
    items.push({ to: "/courses", key: "course.all", icon: BookOpen });
    items.push({ to: "/exams", key: "dash.examArchive", icon: Archive });
    items.push({ to: "/favorites", key: "dash.favorites", icon: Bookmark });
    items.push({ to: "/evaluations", key: "dash.evaluations", icon: FileCheck2 });
    items.push({ to: "/progress", key: "dash.performance", icon: BarChart3 });
  }
  if (onboardingOnly) {
    return (
      <div className="min-h-screen bg-background">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link to="/" aria-label="EXAMPRO">
            <BrandLogo className="h-8" />
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitch />
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              {t("nav.logout")}
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
          {isLoading ? <Loading /> : children}
        </main>
      </div>
    );
  }

  const fullName =
    [me?.profile?.first_name, me?.profile?.last_name].filter(Boolean).join(" ") ||
    me?.profile?.full_name ||
    me?.user.email ||
    "";
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join("");
  const roleLabel = me?.isAdmin
    ? t("admin.adminUsers")
    : me?.isTeacher
      ? t("teacher.title")
      : t("dash.studentSpace");

  return (
    <div
      className={cn(
        "min-h-screen bg-background lg:grid",
        sidebarCollapsed
          ? "lg:grid-cols-[76px_minmax(0,1fr)]"
          : "lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]",
      )}
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col overflow-y-auto bg-sidebar px-4 py-4 text-sidebar-foreground transition-[width,transform] duration-[var(--motion-fast-value)] lg:sticky lg:top-0 lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[76px]" : "lg:w-[var(--sidebar-width)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "flex min-h-[58px] items-center justify-between border-b border-sidebar-border px-2 pb-3",
            sidebarCollapsed && "lg:justify-center",
          )}
        >
          <Link to="/" aria-label="EXAMPRO" className="flex items-center">
            {sidebarCollapsed ? (
              <>
                <BrandLogo className="h-8 lg:hidden" />
                <BrandIcon className="hidden h-9 w-9 lg:block" />
              </>
            ) : (
              <BrandLogo className="h-8" />
            )}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? t("dash.expandSidebar") : t("dash.collapseSidebar")}
            title={sidebarCollapsed ? t("dash.expandSidebar") : t("dash.collapseSidebar")}
            className="hidden rounded-md p-1.5 transition-colors duration-[var(--motion-fast-value)] hover:bg-sidebar-accent lg:inline-flex"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("dash.closeSidebar")}
            className="rounded-md p-1.5 transition-colors duration-[var(--motion-fast-value)] hover:bg-sidebar-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Link
          to="/profile"
          title={sidebarCollapsed ? fullName : undefined}
          className={cn(
            "mt-4 flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-[var(--motion-fast-value)] hover:bg-sidebar-accent",
            sidebarCollapsed && "lg:justify-center lg:px-0",
            location.pathname === "/profile" && "bg-sidebar-accent",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-sidebar-primary">
            {initials || <User className="h-4 w-4" />}
          </span>
          <span className={cn("min-w-0 flex-1", sidebarCollapsed && "lg:hidden")}>
            <span className="block truncate text-xs font-semibold">{fullName}</span>
            <span className="mt-0.5 block truncate text-[10px] text-sidebar-foreground/60">
              {roleLabel}
            </span>
          </span>
        </Link>

        <nav aria-label={t("dash.workspace")} className="mt-5 flex-1">
          <p
            className={cn(
              "mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/50",
              sidebarCollapsed && "lg:hidden",
            )}
          >
            {t("dash.workspace")}
          </p>
          <div className="flex flex-col gap-1">
            {items.map(({ to, key, icon: Icon }) => {
              const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border-l-[3px] border-transparent px-2 py-2.5 text-xs font-semibold text-sidebar-foreground/70 transition-colors duration-[var(--motion-fast-value)] hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    sidebarCollapsed && "lg:justify-center lg:px-0",
                    isActive && "border-l-brand bg-sidebar-accent text-sidebar-foreground",
                  )}
                  title={sidebarCollapsed ? t(key) : undefined}
                  activeOptions={{
                    exact: to === "/admin" || to === "/teacher" || to === "/dashboard",
                  }}
                  activeProps={{
                    className: "border-l-brand bg-sidebar-accent text-sidebar-foreground",
                  }}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-primary")} />
                  <span className={sidebarCollapsed ? "lg:hidden" : ""}>{t(key)}</span>
                </Link>
              );
            })}
          </div>

          {isStudent && (
            <>
              <p
                className={cn(
                  "mb-2 mt-7 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/50",
                  sidebarCollapsed && "lg:hidden",
                )}
              >
                {t("dash.comingSoon")}
              </p>
              <div className="flex flex-col gap-1">
                <span
                  aria-disabled="true"
                  title={sidebarCollapsed ? t("dash.aiTutor") : undefined}
                  className={cn(
                    "flex cursor-not-allowed items-center gap-3 rounded-lg px-2 py-2.5 text-xs font-semibold text-sidebar-foreground/50",
                    sidebarCollapsed && "lg:justify-center lg:px-0",
                  )}
                >
                  <Bot className="h-4 w-4 shrink-0" />
                  <span className={cn("flex-1", sidebarCollapsed && "lg:hidden")}>
                    {t("dash.aiTutor")}
                  </span>
                  <span
                    className={cn(
                      "rounded-full bg-sidebar-primary px-2 py-0.5 text-[8px] font-bold uppercase text-sidebar-primary-foreground",
                      sidebarCollapsed && "lg:hidden",
                    )}
                  >
                    {t("dash.comingSoon")}
                  </span>
                </span>
                <span
                  aria-disabled="true"
                  title={sidebarCollapsed ? t("dash.premium") : undefined}
                  className={cn(
                    "flex cursor-not-allowed items-center gap-3 rounded-lg px-2 py-2.5 text-xs font-semibold text-sidebar-foreground/50",
                    sidebarCollapsed && "lg:justify-center lg:px-0",
                  )}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className={sidebarCollapsed ? "lg:hidden" : ""}>{t("dash.premium")}</span>
                </span>
              </div>
            </>
          )}
        </nav>

        <div className="mt-5 border-t border-sidebar-border pt-3">
          <a
            href="/#contact"
            title={sidebarCollapsed ? t("dash.help") : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-3 py-3 text-xs transition-colors duration-[var(--motion-fast-value)] hover:bg-sidebar-accent",
              sidebarCollapsed && "lg:justify-center lg:px-0",
            )}
          >
            <CircleHelp className="h-5 w-5 shrink-0 text-sidebar-primary" />
            <span className={cn("min-w-0 flex-1", sidebarCollapsed && "lg:hidden")}>
              <span className="block font-semibold text-sidebar-foreground">{t("dash.help")}</span>
              <span className="mt-0.5 block truncate text-[10px] text-sidebar-foreground/60">
                {t("dash.helpHint")}
              </span>
            </span>
            <span className={cn("text-sidebar-foreground/50", sidebarCollapsed && "lg:hidden")}>
              ›
            </span>
          </a>
          <div className="mt-3 flex flex-col gap-2">
            <div className={sidebarCollapsed ? "lg:hidden" : ""}>
              <LanguageSwitch tone="light" />
            </div>
            <button
              type="button"
              onClick={signOut}
              title={sidebarCollapsed ? t("nav.logout") : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors duration-[var(--motion-fast-value)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                sidebarCollapsed && "lg:justify-center lg:px-0",
              )}
            >
              <LogOut className="h-4 w-4" />
              <span className={sidebarCollapsed ? "lg:hidden" : ""}>{t("nav.logout")}</span>
            </button>
          </div>
          {isStudent && !sidebarCollapsed && (
            <p className="mt-3 text-center text-[9px] text-sidebar-foreground/50">
              <span className="font-bold text-sidebar-primary">MVP</span>
              {" · "}
              {t("dash.sidebarFooter")}
            </p>
          )}
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label={t("dash.closeSidebar")}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-primary/40 lg:hidden"
        />
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card/95 px-3 py-3 backdrop-blur sm:px-5 lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("dash.openSidebar")}
            className="shrink-0 rounded-md p-1.5 transition-colors duration-[var(--motion-fast-value)] hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          {isStudent ? (
            <StudentSearch
              levelId={me?.profile?.level_id ?? null}
              trackId={me?.profile?.track_id ?? null}
            />
          ) : (
            <div className="flex-1" />
          )}
          {isStudent && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setNotificationsOpen((shown) => !shown)}
                aria-label={t("dash.notifications")}
                aria-expanded={notificationsOpen}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors duration-[var(--motion-fast-value)] hover:bg-muted hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
              </button>
              {notificationsOpen && (
                <div
                  className="absolute right-0 top-12 z-50 w-72 rounded-xl border bg-card p-4 shadow-card"
                  role="status"
                >
                  <p className="font-semibold text-heading">{t("dash.notifications")}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t("dash.noNotifications")}</p>
                </div>
              )}
            </div>
          )}
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-8 sm:py-9">
          {isLoading ? <Loading /> : children}
        </main>
      </div>
    </div>
  );
}
