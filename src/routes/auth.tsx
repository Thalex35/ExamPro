import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/oauth";
import { AuthBrandLockup, AuthLayout, AuthPasswordField } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

type Mode = "login" | "signup" | "forgot";
type AuthReason = "unauthorized";

export const Route = createFileRoute("/auth")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { mode?: Mode | undefined; reason?: AuthReason | undefined } => ({
    mode: s["mode"] === "signup" || s["mode"] === "forgot" ? s["mode"] : undefined,
    reason: s["reason"] === "unauthorized" ? "unauthorized" : undefined,
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
  const isUnauthorized = search.reason === "unauthorized";
  const navigate = useNavigate();
  const mode: Mode = search.mode ?? "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let redirected = false;
    const callbackError = new URLSearchParams(window.location.search).get("error_description");

    async function verifySession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) {
          toast.error(errMsg(error));
          return;
        }
        if (!data.session) {
          if (callbackError) toast.error(callbackError);
          return;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!active) return;
        if (userError) {
          const code = "code" in userError ? String(userError.code) : "";
          if (
            userError.status === 401 ||
            userError.status === 403 ||
            userError.status === 404 ||
            ["user_not_found", "session_not_found", "refresh_token_not_found", "bad_jwt"].includes(
              code,
            )
          ) {
            await supabase.auth.signOut({ scope: "local" });
            return;
          }
          toast.error(errMsg(userError));
          return;
        }

        if (userData.user && !redirected && !isUnauthorized) {
          redirected = true;
          await navigate({ to: "/onboarding", replace: true });
        }
      } catch (error) {
        if (active) toast.error(errMsg(error));
      }
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") {
        window.setTimeout(() => void verifySession(), 0);
      }
    });
    void verifySession();

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [navigate, errMsg, isUnauthorized]);

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
    if (mode === "signup" && (!firstName.trim() || !lastName.trim())) {
      setValidationError(t("onb.nameRequired"));
      return;
    }
    if (mode === "signup" && `${firstName.trim()} ${lastName.trim()}`.length > 120) {
      setValidationError(t("auth.nameTooLong"));
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
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: `${firstName.trim()} ${lastName.trim()}`,
              language: lang,
            },
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
  const description =
    mode === "login"
      ? t("auth.loginDescription")
      : mode === "signup"
        ? t("auth.signupDescription")
        : t("auth.forgotDescription");

  return (
    <AuthLayout>
      <div className="w-full rounded-[1.75rem] border border-sky-100/80 bg-white p-5 shadow-[0_22px_60px_-32px_rgba(7,37,86,0.3)] sm:p-8 lg:p-9">
        <div className="mb-6 text-center">
          <AuthBrandLockup />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-heading sm:text-[1.8rem]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {isUnauthorized ? (
          <p
            className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            role="alert"
          >
            {t("auth.unauthorized")}
          </p>
        ) : null}
        {info ? (
          <div
            className="mb-4 rounded-xl border border-success/30 bg-success/5 p-4 text-sm text-success"
            role="status"
          >
            {info}
          </div>
        ) : null}
        <form onSubmit={submit} className="flex flex-col gap-5">
          {formError && (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </p>
          )}
          {mode === "signup" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="first-name">{t("auth.firstName")}</Label>
                <Input
                  id="first-name"
                  required
                  maxLength={80}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="last-name">{t("auth.lastName")}</Label>
                <Input
                  id="last-name"
                  required
                  maxLength={80}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="email"
                type="email"
                required
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-12 rounded-xl pl-10"
              />
            </div>
          </div>
          {mode !== "forgot" && (
            <AuthPasswordField
              id="password"
              label={t("auth.password")}
              value={password}
              onChange={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              action={
                mode === "login" ? (
                  <Link
                    to="/auth"
                    search={{ mode: "forgot" }}
                    className="text-xs font-medium text-deep transition-colors hover:text-brand"
                  >
                    {t("auth.forgot")}
                  </Link>
                ) : undefined
              }
            />
          )}
          {mode === "signup" && (
            <AuthPasswordField
              id="confirm-password"
              label={t("auth.confirmPassword")}
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              autoComplete="new-password"
              minLength={8}
              invalid={!!validationError}
              describedBy={validationError ? "confirm-password-error" : undefined}
            />
          )}
          {validationError && (
            <p id="confirm-password-error" className="text-sm text-destructive" role="alert">
              {validationError}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy}
            size="lg"
            className="h-12 w-full rounded-xl font-semibold"
          >
            {mode === "login"
              ? t("auth.submitLogin")
              : mode === "signup"
                ? t("auth.submitSignup")
                : t("auth.sendReset")}
          </Button>
        </form>
        {mode !== "forgot" && (
          <div className="mt-5">
            <div className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> {t("auth.or")}{" "}
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={google}
              type="button"
              disabled={busy}
              className="h-12 w-full rounded-xl bg-white font-semibold"
            >
              <span
                aria-hidden="true"
                className="bg-[conic-gradient(from_30deg,#4285f4_0_25%,#34a853_25%_50%,#fbbc05_50%_70%,#ea4335_70%_85%,#4285f4_85%)] bg-clip-text text-lg font-bold text-transparent"
              >
                G
              </span>
              {t("auth.google")}
            </Button>
          </div>
        )}
        <p className="mt-7 text-center text-sm text-muted-foreground">
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
    </AuthLayout>
  );
}
