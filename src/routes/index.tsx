import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  Languages,
  Library,
  Menu,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandIcon, BrandLogo } from "@/components/Brand";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EXAMPRO — Préparez vos examens officiels en Haïti" },
      {
        name: "description",
        content:
          "Cours et anciens examens classés par niveau, filière, matière et chapitre pour les élèves de 9e AF et de Terminale.",
      },
      { property: "og:title", content: "EXAMPRO — Learn · Practice · Succeed" },
      {
        property: "og:description",
        content: "Cours et anciens examens pour les élèves haïtiens de 9e AF et de Terminale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  const { data: me } = useMe();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = () => setMobileNavOpen(false);
  const navLinks = [
    { href: "#top", label: t("landing.navHome") },
    { href: "#mission", label: t("landing.navFeatures") },
    { href: "#how", label: t("landing.navHow") },
    { href: "#about", label: t("landing.navAbout") },
    { href: "#contact", label: t("landing.navContact") },
  ];

  return (
    <div className="public-site" id="top">
      <header className="public-header">
        <div className="public-nav">
          <Link
            to="/"
            className="public-brand"
            aria-label="EXAMPRO — Accueil"
            onClick={closeMobileNav}
          >
            <BrandLogo className="h-10 sm:h-11" />
          </Link>

          <div
            id="public-navigation"
            className={`public-nav-content${mobileNavOpen ? " is-open" : ""}`}
          >
            <nav className="public-links" aria-label={t("landing.navLabel")}>
              {navLinks.map((item) => (
                <a key={item.href} href={item.href} onClick={closeMobileNav}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="public-actions">
              <LanguageSwitch />
              {me ? (
                <Button asChild size="sm">
                  <Link to="/dashboard">{t("nav.dashboard")}</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/auth" onClick={closeMobileNav}>
                      {t("nav.login")}
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/auth" search={{ mode: "signup" }} onClick={closeMobileNav}>
                      {t("nav.signup")}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            className="public-mobile-toggle"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label={mobileNavOpen ? t("landing.closeMenu") : t("landing.openMenu")}
            aria-expanded={mobileNavOpen}
            aria-controls="public-navigation"
          >
            {mobileNavOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main>
        <section className="public-hero">
          <div className="public-hero-inner">
            <div className="public-hero-copy">
              <span className="public-eyebrow">
                <span className="public-eyebrow-dot" />
                {t("landing.heroEyebrow")}
              </span>
              <h1>
                {t("landing.heroTitle")}
                <span>{t("landing.heroTitleAccent")}</span>
              </h1>
              <p>{t("landing.heroDescription")}</p>
              <div className="public-hero-actions">
                <Button asChild variant="hero" size="lg">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    {t("landing.heroPrimary")} <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <a className="public-secondary-action" href="#mission">
                  <span className="public-play-icon">
                    <BookOpen aria-hidden="true" />
                  </span>
                  {t("landing.heroSecondary")}
                </a>
              </div>
              <div className="public-trust-row">
                <span>
                  <CheckCircle2 aria-hidden="true" />
                  {t("landing.trustLevel")}
                </span>
                <span>
                  <CheckCircle2 aria-hidden="true" />
                  {t("landing.trustLanguage")}
                </span>
                <span>
                  <CheckCircle2 aria-hidden="true" />
                  {t("landing.trustResources")}
                </span>
              </div>
            </div>

            <div className="public-hero-visual" role="img" aria-label={t("landing.previewLabel")}>
              <div className="public-visual-orbit public-visual-orbit-one" />
              <div className="public-visual-orbit public-visual-orbit-two" />
              <div className="public-preview-window">
                <div className="public-preview-top">
                  <span className="public-preview-brand">
                    <BrandIcon className="h-7 w-7" />
                  </span>
                  <span className="public-preview-search">
                    <Library aria-hidden="true" /> {t("landing.previewResources")}
                  </span>
                  <span className="public-preview-avatar" aria-hidden="true">
                    <GraduationCap />
                  </span>
                </div>
                <div className="public-preview-body">
                  <div className="public-preview-sidebar" aria-hidden="true">
                    <span className="active">
                      <BookOpen />
                    </span>
                    <span>
                      <Library />
                    </span>
                    <span>
                      <FileText />
                    </span>
                  </div>
                  <div className="public-preview-content">
                    <span className="public-preview-kicker">{t("landing.previewKicker")}</span>
                    <strong>{t("landing.previewTitle")}</strong>
                    <div className="public-preview-subject">
                      <span className="public-preview-subject-icon">
                        <BookOpen />
                      </span>
                      <span>
                        <small>{t("landing.previewSection")}</small>
                        <b>{t("landing.previewSubject")}</b>
                      </span>
                      <ChevronRight aria-hidden="true" />
                    </div>
                    <div className="public-preview-lines" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              </div>
              <div className="public-float-card public-float-resources">
                <span className="public-float-icon">
                  <FileText aria-hidden="true" />
                </span>
                <span>
                  <strong>{t("landing.floatExams")}</strong>
                  <small>{t("landing.floatExamsDescription")}</small>
                </span>
              </div>
              <div className="public-float-card public-float-learning">
                <span className="public-float-icon">
                  <GraduationCap aria-hidden="true" />
                </span>
                <span>
                  <strong>{t("landing.floatCourses")}</strong>
                  <small>{t("landing.floatCoursesDescription")}</small>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section public-mission" id="mission">
          <div className="public-section-heading">
            <span className="public-section-label">{t("landing.missionLabel")}</span>
            <h2>{t("landing.missionTitle")}</h2>
            <p>{t("landing.missionDescription")}</p>
          </div>
          <div className="public-feature-grid">
            {[
              {
                icon: Library,
                tone: "blue",
                title: t("landing.featureArchiveTitle"),
                text: t("landing.featureArchiveText"),
              },
              {
                icon: GraduationCap,
                tone: "cyan",
                title: t("landing.featureLevelTitle"),
                text: t("landing.featureLevelText"),
              },
              {
                icon: BookOpen,
                tone: "green",
                title: t("landing.featureCoursesTitle"),
                text: t("landing.featureCoursesText"),
              },
              {
                icon: Languages,
                tone: "orange",
                title: t("landing.featureLanguagesTitle"),
                text: t("landing.featureLanguagesText"),
              },
            ].map((item) => (
              <article className="public-feature-card" key={item.title}>
                <span className={`public-feature-icon ${item.tone}`}>
                  <item.icon aria-hidden="true" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <a href="#how">
                  {t("landing.explore")} <ArrowRight aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="public-steps-section" id="how">
          <div className="public-steps-visual">
            <div className="public-learning-card">
              <div className="public-learning-card-header">
                <BrandIcon className="h-10 w-10" />
                <span>
                  <small>{t("landing.pathLabel")}</small>
                  <strong>{t("landing.pathTitle")}</strong>
                </span>
              </div>
              <div className="public-learning-step">
                <span className="complete">
                  <CheckCircle2 aria-hidden="true" />
                </span>
                <span>
                  <small>{t("landing.pathStepOne")}</small>
                  <strong>{t("landing.pathStepOneText")}</strong>
                </span>
              </div>
              <div className="public-learning-step">
                <span>
                  <BookOpen aria-hidden="true" />
                </span>
                <span>
                  <small>{t("landing.pathStepTwo")}</small>
                  <strong>{t("landing.pathStepTwoText")}</strong>
                </span>
              </div>
              <div className="public-learning-step">
                <span>
                  <FileText aria-hidden="true" />
                </span>
                <span>
                  <small>{t("landing.pathStepThree")}</small>
                  <strong>{t("landing.pathStepThreeText")}</strong>
                </span>
              </div>
            </div>
            <div className="public-verification-note">
              <CheckCircle2 aria-hidden="true" />
              <span>
                <strong>{t("landing.resourceAccessTitle")}</strong>
                <small>{t("landing.resourceAccessText")}</small>
              </span>
            </div>
          </div>
          <div className="public-steps-copy">
            <span className="public-section-label">{t("landing.howLabel")}</span>
            <h2>{t("landing.howTitle")}</h2>
            <p className="public-steps-intro">{t("landing.howDescription")}</p>
            {[
              ["01", t("landing.stepOneTitle"), t("landing.stepOneText")],
              ["02", t("landing.stepTwoTitle"), t("landing.stepTwoText")],
              ["03", t("landing.stepThreeTitle"), t("landing.stepThreeText")],
            ].map(([number, title, description]) => (
              <div className="public-step" key={number}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </div>
            ))}
            <Button asChild variant="hero">
              <Link to="/auth" search={{ mode: "signup" }}>
                {t("landing.createProfile")} <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="public-section public-audience" id="about">
          <div className="public-section-heading">
            <span className="public-section-label">{t("landing.aboutLabel")}</span>
            <h2>{t("landing.aboutTitle")}</h2>
            <p>{t("landing.aboutDescription")}</p>
          </div>
          <div className="public-audience-grid">
            <article className="public-audience-card">
              <span className="public-audience-icon">
                <GraduationCap aria-hidden="true" />
              </span>
              <h3>{t("landing.studentTitle")}</h3>
              <p>{t("landing.studentDescription")}</p>
              <Link to="/auth" search={{ mode: "signup" }}>
                {t("landing.studentAction")} <ChevronRight aria-hidden="true" />
              </Link>
            </article>
            <article className="public-audience-card">
              <span className="public-audience-icon">
                <BookOpen aria-hidden="true" />
              </span>
              <h3>{t("landing.teacherTitle")}</h3>
              <p>{t("landing.teacherDescription")}</p>
              <Link to="/auth" search={{ mode: "signup" }}>
                {t("landing.teacherAction")} <ChevronRight aria-hidden="true" />
              </Link>
            </article>
          </div>
        </section>

        <section className="public-faq-section" id="faq">
          <div className="public-faq-heading">
            <span className="public-section-label">{t("landing.faqLabel")}</span>
            <h2>{t("landing.faqTitle")}</h2>
            <p>{t("landing.faqDescription")}</p>
            <a href="#contact">
              {t("landing.faqContact")} <ArrowRight aria-hidden="true" />
            </a>
          </div>
          <div className="public-faq-list">
            {[
              [t("landing.faqOneQuestion"), t("landing.faqOneAnswer")],
              [t("landing.faqTwoQuestion"), t("landing.faqTwoAnswer")],
              [t("landing.faqThreeQuestion"), t("landing.faqThreeAnswer")],
            ].map(([question, answer], index) => (
              <details key={question} open={index === 0}>
                <summary>
                  {question}
                  <Plus aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="public-final-cta">
          <div>
            <span className="public-section-label">{t("landing.ctaLabel")}</span>
            <h2>{t("landing.ctaTitle")}</h2>
            <p>{t("landing.ctaDescription")}</p>
          </div>
          <Button asChild variant="hero" size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>
              {t("landing.ctaButton")} <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="public-footer" id="contact">
        <div className="public-footer-main">
          <div className="public-footer-brand">
            <Link to="/" aria-label="EXAMPRO — Accueil">
              <BrandLogo className="h-10" />
            </Link>
            <p>{t("landing.footerTagline")}</p>
            <p>{t("landing.footerDescription")}</p>
          </div>
          <div className="public-footer-links">
            <strong>{t("landing.footerPlatform")}</strong>
            <a href="#mission">{t("landing.navFeatures")}</a>
            <Link to="/exams">{t("landing.footerExams")}</Link>
            <Link to="/subjects">{t("landing.footerCourses")}</Link>
          </div>
          <div className="public-footer-links">
            <strong>{t("landing.footerAbout")}</strong>
            <a href="#about">{t("landing.navAbout")}</a>
            <a href="#how">{t("landing.navHow")}</a>
            <a href="#faq">{t("landing.navFaq")}</a>
          </div>
          <div className="public-footer-links">
            <strong>{t("landing.navContact")}</strong>
            <p>{t("landing.footerContactNote")}</p>
          </div>
        </div>
        <div className="public-footer-bottom">
          <span>
            © {new Date().getFullYear()} EXAMPRO · {t("brand.tagline")}
          </span>
          <span className="public-footer-language">
            <Languages aria-hidden="true" /> Français · Kreyòl
          </span>
        </div>
      </footer>
    </div>
  );
}
