import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Archive,
  BarChart3,
  Bookmark,
  BookOpen,
  Bot,
  ChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trackFilter } from "@/lib/catalog";
import { openExamFile } from "@/lib/files";
import { formatExamYear } from "@/lib/exam-years";
import { useMe } from "@/lib/session";
import { useI18n, type TKey } from "@/lib/i18n";
import { BrandIcon } from "./Brand";
import { LanguageSwitch } from "./LanguageSwitch";
import { ErrorState, Loading } from "./States";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FavoriteButton } from "@/components/FavoriteButton";

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
                <div key={`course-${course.id}`} className="flex items-center gap-1">
                  <Link
                    to="/courses/$courseId"
                    params={{ courseId: course.id }}
                    onClick={() => setFocused(false)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted"
                  >
                    <BookOpen className="h-4 w-4 shrink-0 text-deep" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">
                      {course.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{t("dash.courseResult")}</span>
                  </Link>
                  <FavoriteButton kind="course" resourceId={course.id} iconOnly />
                </div>
              ))}
              {results.data?.exams.map((exam) => (
                <div key={`exam-${exam.id}`} className="flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void openExam(exam.file_path, exam.id, exam.demo_content)}
                    disabled={busyExam === exam.id}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted disabled:opacity-60"
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
                  <FavoriteButton kind="exam" resourceId={exam.id} iconOnly />
                </div>
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
  const { t, errMsg } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const needsOnboarding = !!me && !me.profile?.onboarded && !me.isAdmin;
  useEffect(() => {
    if (needsOnboarding && location.pathname !== "/onboarding")
      navigate({ to: "/onboarding", replace: true });
  }, [needsOnboarding, location.pathname, navigate]);
  useEffect(() => setOpen(false), [location.pathname]);

  async function signOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    await qc.cancelQueries();
    qc.clear();
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
    return <div className="min-h-screen bg-background">{isLoading ? <Loading /> : children}</div>;
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
          "fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col overflow-hidden bg-sidebar px-4 py-4 text-sidebar-foreground transition-[width,transform] duration-[var(--motion-fast-value)] lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[76px]" : "lg:w-[var(--sidebar-width)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "relative flex min-h-[72px] shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-1 pb-4",
            sidebarCollapsed && "lg:justify-center",
          )}
        >
          <Link to="/" aria-label="EXAMPRO" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-active ring-1 ring-sidebar-primary/20">
              <BrandIcon className="h-10 w-10" />
            </span>
            <span className={cn("min-w-0", sidebarCollapsed && "lg:hidden")}>
              <span className="block text-lg font-extrabold leading-none tracking-tight text-sidebar-foreground">
                EXAM<span className="text-sidebar-primary">PRO</span>
              </span>
              <span className="mt-1 block truncate text-[9px] leading-tight text-sidebar-foreground/65">
                {t("brand.tagline")}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? t("dash.expandSidebar") : t("dash.collapseSidebar")}
            title={sidebarCollapsed ? t("dash.expandSidebar") : t("dash.collapseSidebar")}
            className={cn(
              "hidden rounded-md p-1.5 transition-colors duration-[var(--motion-fast-value)] hover:bg-sidebar-accent lg:inline-flex",
              sidebarCollapsed && "lg:absolute lg:right-0 lg:top-0",
            )}
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

        <nav
          aria-label={t("dash.workspace")}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-5"
        >
          <p
            className={cn(
              "mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/55",
              sidebarCollapsed && "lg:hidden",
            )}
          >
            {t("dash.workspace")}
          </p>
          <div className="flex flex-col gap-1">
            {items.map(({ to, key, icon: Icon }) => {
              const exactMatch = to === "/admin" || to === "/teacher" || to === "/dashboard";
              const isActive =
                location.pathname === to || (!exactMatch && location.pathname.startsWith(`${to}/`));
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-xs font-semibold text-sidebar-foreground/75 transition-colors duration-[var(--motion-fast-value)] hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    sidebarCollapsed && "lg:justify-center lg:px-0",
                    isActive &&
                      "border-sidebar-primary/20 bg-sidebar-active text-sidebar-foreground shadow-sm before:absolute before:bottom-2 before:left-0 before:top-2 before:w-1 before:rounded-r-full before:bg-sidebar-primary before:content-['']",
                  )}
                  title={sidebarCollapsed ? t(key) : undefined}
                  activeOptions={{
                    exact: exactMatch,
                  }}
                  activeProps={{
                    className:
                      "border-sidebar-primary/20 bg-sidebar-active text-sidebar-foreground shadow-sm before:absolute before:bottom-2 before:left-0 before:top-2 before:w-1 before:rounded-r-full before:bg-sidebar-primary before:content-['']",
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
                  "mb-2 mt-7 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/50",
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
                    "flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold text-sidebar-foreground/50",
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
                    "flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold text-sidebar-foreground/50",
                    sidebarCollapsed && "lg:justify-center lg:px-0",
                  )}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className={sidebarCollapsed ? "lg:hidden" : ""}>{t("dash.premium")}</span>
                </span>
              </div>
            </>
          )}
          {isStudent && !sidebarCollapsed && (
            <p className="mb-2 mt-4 px-2 text-center text-[9px] text-sidebar-foreground/50">
              <span className="font-bold text-sidebar-primary">MVP</span>
              {" · "}
              {t("dash.sidebarFooter")}
            </p>
          )}
        </nav>

        <div className="mt-3 shrink-0 px-1">
          <div className="mt-3 border-t border-sidebar-border pt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={signingOut}
                  aria-label={fullName}
                  title={sidebarCollapsed ? fullName : undefined}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-[var(--motion-fast-value)] hover:bg-sidebar-accent disabled:opacity-60",
                    sidebarCollapsed && "lg:justify-center lg:px-0",
                  )}
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-sidebar-primary ring-1 ring-sidebar-primary/25">
                    {initials || <User className="h-4 w-4" />}
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-success"
                    />
                  </span>
                  <span className={cn("min-w-0 flex-1", sidebarCollapsed && "lg:hidden")}>
                    <span className="block truncate text-xs font-semibold">{fullName}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-sidebar-foreground/60">
                      {roleLabel}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-sidebar-foreground/65",
                      sidebarCollapsed && "lg:hidden",
                    )}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align={sidebarCollapsed ? "center" : "start"}
                sideOffset={8}
                className="z-50 w-56 border-sidebar-border bg-sidebar text-sidebar-foreground"
              >
                <DropdownMenuLabel className="px-3 py-2">
                  <span className="block truncate text-xs font-semibold">{fullName}</span>
                  <span className="mt-0.5 block truncate text-[10px] font-normal text-sidebar-foreground/60">
                    {roleLabel}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-sidebar-border" />
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer focus:bg-sidebar-accent focus:text-sidebar-foreground"
                >
                  <Link to="/profile">
                    <User className="text-sidebar-primary" />
                    {t("profile.title")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={signingOut}
                  onSelect={() => void signOut()}
                  className="cursor-pointer text-red-300 focus:bg-red-500/10 focus:text-red-200"
                >
                  <LogOut />
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
          <LanguageSwitch />
          <ThemeToggle />
          {me && <NotificationCenter />}
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-8 sm:py-9">
          {isLoading ? <Loading /> : children}
        </main>
      </div>
    </div>
  );
}
