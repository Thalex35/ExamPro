import type { ReactNode } from "react";
import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  CircleCheck,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { BrandLogo } from "@/components/Brand";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-background md:grid md:grid-cols-2">
      <section className="hero-surface relative isolate flex min-h-[11.5rem] flex-col overflow-hidden px-5 py-5 sm:min-h-[14rem] sm:px-8 sm:py-7 md:min-h-screen md:justify-between md:px-10 md:py-10 lg:px-14 lg:py-12">
        <div
          aria-hidden="true"
          className="absolute -right-36 -top-32 -z-10 h-[28rem] w-[28rem] rounded-full border-[4rem] border-brand/10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-48 -left-28 -z-10 h-[32rem] w-[32rem] rounded-full bg-blue-500/20 blur-3xl"
        />
        <div>
          <Link
            to="/"
            aria-label="EXAMPRO"
            className="inline-flex rounded-2xl bg-white p-2.5 shadow-lg shadow-slate-950/10"
          >
            <BrandLogo className="h-16 sm:h-24 md:h-32" />
          </Link>
          <p className="mt-3 text-xs font-semibold tracking-wide text-primary-foreground/90 sm:text-sm md:mt-4 md:text-base">
            {t("brand.tagline")}
          </p>
        </div>

        <div className="my-4 max-w-xl md:my-10">
          <h2 className="max-w-[15ch] text-xl font-extrabold leading-tight tracking-tight text-primary-foreground sm:text-2xl md:text-3xl lg:text-4xl">
            {t("landing.title")}
          </h2>
          <p className="mt-3 hidden max-w-lg text-sm leading-6 text-primary-foreground/75 md:block lg:text-base">
            {t("auth.brandDescription")}
          </p>
          <div className="mt-6 hidden grid-cols-4 gap-3 md:grid lg:mt-10 lg:gap-5">
            <BrandFeature icon={BookOpen} label={t("auth.brandCourses")} />
            <BrandFeature icon={CircleCheck} label={t("auth.brandQuizzes")} />
            <BrandFeature icon={FileText} label={t("auth.brandExams")} />
            <BrandFeature icon={ChartNoAxesColumnIncreasing} label={t("auth.brandProgress")} />
          </div>
        </div>
        <p className="hidden text-xs text-primary-foreground/60 md:block">
          © {new Date().getFullYear()} EXAMPRO
        </p>
      </section>

      <section className="flex min-h-[calc(100vh-11.5rem)] flex-col px-4 pb-8 pt-5 sm:min-h-[calc(100vh-14rem)] sm:px-8 sm:pt-7 md:min-h-screen md:px-10 md:py-8 lg:px-14">
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

export function AuthPasswordField({
  id,
  label,
  value,
  onChange,
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
        <Input
          id={id}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="h-12 rounded-xl pr-12"
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
    <div className="flex flex-col items-center gap-2 text-center text-xs font-medium leading-4 text-primary-foreground/90">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/15 text-brand ring-1 ring-brand/20">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      {label}
    </div>
  );
}
