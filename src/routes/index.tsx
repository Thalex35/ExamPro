import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, FileText, GraduationCap, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandIcon, BrandLogo } from "@/components/Brand";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EXAMPRO — Préparez vos examens officiels en Haïti" },
      { name: "description", content: "Cours et anciens examens classés par niveau, filière et matière pour les élèves de 9e AF et de Terminale." },
      { property: "og:title", content: "EXAMPRO — Learn · Practice · Succeed" },
      { property: "og:description", content: "Cours et anciens examens pour les élèves haïtiens de 9e AF et de Terminale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  const { data: me } = useMe();
  const benefits = [
    { icon: GraduationCap, t: t("landing.b1.t"), d: t("landing.b1.d") },
    { icon: FileText, t: t("landing.b2.t"), d: t("landing.b2.d") },
    { icon: BookOpen, t: t("landing.b3.t"), d: t("landing.b3.d") },
    { icon: Languages, t: t("landing.b4.t"), d: t("landing.b4.d") },
  ];
  const steps = [t("landing.h1"), t("landing.h2"), t("landing.h3")];

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <BrandLogo className="h-10 sm:h-12" />
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitch />
            {me ? (
              <Button asChild size="sm">
                <Link to="/dashboard">{t("nav.dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/auth">{t("nav.login")}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth" search={{ mode: "signup" }}>{t("nav.signup")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hero-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-8 md:grid-cols-[1.3fr_1fr] md:py-24">
          <div>
            <p className="mb-4 inline-block rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">{t("landing.eyebrow")}</p>
            <h1 className="text-4xl font-extrabold leading-tight text-primary-foreground sm:text-5xl">{t("landing.title")}</h1>
            <p className="mt-5 max-w-xl text-lg text-primary-foreground/80">{t("landing.subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>{t("landing.cta")}</Link>
              </Button>
              <Button asChild variant="outline-light" size="lg">
                <Link to="/auth">{t("landing.cta2")}</Link>
              </Button>
            </div>
          </div>
          <div className="hidden justify-center md:flex">
            <div className="rounded-3xl bg-card p-10 shadow-brand">
              <BrandIcon className="h-48 w-48" />
              <p className="mt-4 text-center text-sm font-semibold tracking-widest text-deep">{t("brand.tagline")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <h2 className="text-2xl font-bold sm:text-3xl">{t("landing.benefits")}</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.t} className="card-surface p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{b.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("landing.how")}</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{i + 1}</span>
                <p className="pt-2 font-medium text-heading">{s}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 text-sm text-muted-foreground">
            {t("landing.teacherCta")}{" "}
            <Link to="/auth" search={{ mode: "signup" }} className="font-semibold text-deep underline-offset-4 hover:underline">
              {t("nav.signup")}
            </Link>
          </p>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-8">
        <BrandLogo className="h-8" />
        <span>© {new Date().getFullYear()} EXAMPRO · {t("brand.tagline")}</span>
      </footer>
    </div>
  );
}
