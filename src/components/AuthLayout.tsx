import type { ReactNode } from "react";
import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  CircleCheck,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { BrandIcon } from "@/components/Brand";
import darkWordmark from "@/assets/ExamPro wordmark.png";
import lightWordmark from "@/assets/ExamPro wordmark on navy.png";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-background md:grid md:grid-cols-2">
      <section className="hero-surface relative isolate flex min-h-[16rem] flex-col overflow-hidden px-5 py-6 sm:min-h-[18rem] sm:px-8 sm:py-8 md:min-h-screen md:px-10 md:py-10 lg:px-14 lg:py-12">
        <div
          aria-hidden="true"
          className="absolute -right-36 -top-44 -z-10 h-[34rem] w-[34rem] rounded-full border-[5rem] border-brand/10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-48 -left-28 -z-10 h-[32rem] w-[32rem] rounded-full bg-blue-500/20 blur-3xl"
        />
        <header className="relative z-10">
          <Link to="/" aria-label="EXAMPRO, accueil" className="inline-flex items-center gap-3">
            <BrandIcon className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
            <img
              src={lightWordmark}
              alt="EXAMPRO"
              className="h-9 w-auto max-w-[min(62vw,17rem)] object-contain sm:h-11"
            />
          </Link>
          <p className="ml-[4.25rem] mt-1 text-[11px] font-semibold tracking-[0.12em] text-primary-foreground/75 sm:ml-[4.75rem] sm:text-xs">
            {t("brand.tagline")}
          </p>
        </header>

        <div className="relative z-10 mt-9 max-w-xl sm:mt-11 md:my-auto md:pb-24 md:pt-12 lg:pb-28 lg:pt-16">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-brand sm:text-xs">
            {t("auth.brandEyebrow")}
          </p>
          <h2 className="max-w-[15ch] text-2xl font-extrabold leading-[1.13] tracking-tight text-primary-foreground sm:text-3xl md:text-3xl lg:text-[2.65rem]">
            {t("landing.title")}
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-primary-foreground/75 lg:text-base">
            {t("auth.brandDescription")}
          </p>
          <div className="mt-6 grid max-w-xl grid-cols-4 gap-2 sm:mt-8 sm:gap-3 lg:mt-10 lg:gap-4">
            <BrandFeature icon={BookOpen} label={t("auth.brandCourses")} />
            <BrandFeature icon={CircleCheck} label={t("auth.brandQuizzes")} />
            <BrandFeature icon={FileText} label={t("auth.brandExams")} />
            <BrandFeature icon={ChartNoAxesColumnIncreasing} label={t("auth.brandProgress")} />
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-12 right-6 z-0 hidden h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-sky-300/20 via-blue-400/10 to-transparent md:flex lg:bottom-16 lg:right-10 lg:h-64 lg:w-64">
          <div className="absolute bottom-7 h-12 w-36 -rotate-6 rounded-lg border-b-4 border-cyan-300/80 bg-white/10 shadow-lg shadow-slate-950/10 lg:bottom-9 lg:h-14 lg:w-48" />
          <div className="absolute bottom-10 h-11 w-32 rotate-3 rounded-lg border-b-4 border-sky-300/80 bg-sky-100/15 shadow-md lg:bottom-14 lg:h-12 lg:w-40" />
          <BrandIcon className="relative -mt-7 h-40 w-40 object-contain drop-shadow-xl lg:-mt-10 lg:h-56 lg:w-56" />
        </div>
        <footer className="relative z-10 mt-auto hidden text-xs text-primary-foreground/55 md:block">
          © {new Date().getFullYear()} EXAMPRO
        </footer>
      </section>

      <section className="flex min-h-[calc(100vh-16rem)] flex-col bg-[#f7f9fc] px-4 pb-8 pt-5 sm:min-h-[calc(100vh-18rem)] sm:px-8 sm:pt-7 md:min-h-screen md:px-10 md:py-8 lg:px-14">
        <div className="flex justify-end">
          <LanguageSwitch />
        </div>
        <div className="mx-auto flex w-full max-w-[34rem] flex-1 items-center justify-center py-6 sm:py-8">
          {children}
        </div>
        <p className="text-center text-xs text-muted-foreground md:hidden">
          © {new Date().getFullYear()} EXAMPRO
        </p>
      </section>
    </main>
  );
}

export function AuthBrandLockup({ tone = "light" }: { tone?: "light" | "dark" }) {
  const wordmark = tone === "dark" ? lightWordmark : darkWordmark;
  return (
    <Link
      to="/"
      aria-label="EXAMPRO, accueil"
      className="mx-auto inline-flex items-center justify-center gap-2.5"
    >
      <BrandIcon className="h-12 w-12 shrink-0 sm:h-14 sm:w-14" />
      <img
        src={wordmark}
        alt="EXAMPRO"
        className="h-9 w-auto max-w-[min(64vw,17rem)] object-contain sm:h-10"
      />
    </Link>
  );
}

export function AuthPasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  minLength,
  invalid,
  describedBy,
  action,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  invalid?: boolean;
  describedBy?: string | undefined;
  action?: ReactNode | undefined;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      <div className="relative">
        <LockKeyhole
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="h-12 rounded-xl pl-10 pr-12"
        />
        <button
          type="button"
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-1 inline-flex w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

function BrandFeature({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center text-[10px] font-medium leading-4 text-primary-foreground/90 sm:text-xs">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-foreground/10 bg-white/5 text-brand sm:h-11 sm:w-11">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </span>
      <span>{label}</span>
    </div>
  );
}
