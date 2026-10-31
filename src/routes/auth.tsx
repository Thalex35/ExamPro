import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/oauth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/Brand";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n } from "@/lib/i18n";

type Mode = "login" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode | undefined } => ({
    mode: s["mode"] === "signup" || s["mode"] === "forgot" ? s["mode"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Connexion — EXAMPRO" },
      { name: "description", content: "Connectez-vous ou créez votre compte EXAMPRO." },
      { property: "og:title", content: "Connexion — EXAMPRO" },
      { property: "og:description", content: "Accédez à vos cours et examens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, errMsg } = useI18n();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const mode: Mode = search.mode ?? "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/onboarding", replace: true });
    });
    const callbackError = new URLSearchParams(window.location.search).get("error_description");
    void supabase.auth
      .getSession()
      .then(({ data: sessionData, error }) => {
        if (!active) return;
        if (error) {
          toast.error(errMsg(error));
        } else if (sessionData.session) {
          navigate({ to: "/onboarding", replace: true });
        } else if (callbackError) {
          toast.error(callbackError);
        }
      })
      .catch((error: unknown) => {
        if (active) toast.error(errMsg(error));
      });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [navigate, errMsg]);

  useEffect(() => {
    setInfo(null);
    setValidationError(null);
    setFormError(null);
  }, [mode]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setFormError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (mode === "signup" && !name.trim()) {
      setValidationError(t("onb.nameRequired"));
      return;
    }
    setBusy(true);
    setInfo(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
      } else if (mode === "signup") {
        if (password !== confirmPassword) {
          setValidationError(t("auth.passwordMismatch"));
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/onboarding",
            data: { full_name: name.trim(), language: lang },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/onboarding", replace: true });
        } else {
          setInfo(t("auth.checkEmail"));
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setInfo(t("auth.resetSent"));
      }
    } catch (err) {
      const errorCode =
        typeof err === "object" && err !== null && "code" in err ? err.code : undefined;
      if (errorCode === "email_address_invalid") {
        setFormError(t("auth.emailRejected"));
      } else {
        toast.error(errMsg(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    try {
      const { error } = await signInWithGoogle(window.location.origin);
      if (error) throw error;
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "login"
      ? t("auth.loginTitle")
      : mode === "signup"
        ? t("auth.signupTitle")
        : t("auth.forgotTitle");

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hero-surface hidden flex-col justify-between p-10 md:flex">
        <p className="text-sm font-semibold tracking-widest text-brand">{t("brand.tagline")}</p>
        <h2 className="max-w-md text-3xl font-bold leading-snug text-primary-foreground">
          {t("landing.title")}
        </h2>
        <p className="text-sm text-primary-foreground/70">EXAMPRO</p>
      </div>
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/">
            <BrandLogo className="h-9" />
          </Link>
          <div className="flex items-center gap-4">
            {mode === "signup" && (
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-sm font-medium text-deep hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("auth.backHome")}
              </Link>
            )}
            <LanguageSwitch />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-bold">{title}</h1>
          {info ? (
            <div
              className="mt-6 rounded-lg border border-success/30 bg-card p-4 text-sm text-success"
              role="status"
            >
              {info}
            </div>
          ) : null}
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
            {mode === "signup" && (
              <div className="grid gap-1.5">
                <Label htmlFor="name">{t("auth.fullName")}</Label>
                <Input
                  id="name"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            {mode !== "forgot" && (
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  {mode === "login" && (
                    <Link
                      to="/auth"
                      search={{ mode: "forgot" }}
                      className="text-xs text-deep hover:underline"
                    >
                      {t("auth.forgot")}
                    </Link>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>
            )}
            {mode === "signup" && (
              <div className="grid gap-1.5">
                <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={!!validationError}
                  aria-describedby={validationError ? "confirm-password-error" : undefined}
                />
              </div>
            )}
            {validationError && (
              <p id="confirm-password-error" className="text-sm text-destructive" role="alert">
                {validationError}
              </p>
            )}
            <Button type="submit" disabled={busy} size="lg">
              {mode === "login"
                ? t("auth.submitLogin")
                : mode === "signup"
                  ? t("auth.submitSignup")
                  : t("auth.sendReset")}
            </Button>
          </form>
          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs uppercase text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> {t("auth.or")}{" "}
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" size="lg" onClick={google} type="button" disabled={busy}>
                {t("auth.google")}
              </Button>
            </>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {t("auth.noAccount")}{" "}
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="font-semibold text-deep hover:underline"
                >
                  {t("nav.signup")}
                </Link>
              </>
            ) : mode === "signup" ? (
              <>
                {t("auth.haveAccount")}{" "}
                <Link to="/auth" className="font-semibold text-deep hover:underline">
                  {t("nav.login")}
                </Link>
              </>
            ) : (
              <Link to="/auth" className="font-semibold text-deep hover:underline">
                {t("auth.back")}
              </Link>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
