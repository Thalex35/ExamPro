import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/auth";
import { Route as ResetPasswordRoute } from "@/routes/reset-password";

const mocks = vi.hoisted(() => ({
  mode: "login" as "login" | "signup" | "forgot",
  navigate: vi.fn(),
  getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
  getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
  signInWithPassword: vi.fn(async () => ({ error: null })),
  signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
  resetPasswordForEmail: vi.fn(async () => ({ error: null })),
  signOut: vi.fn(async () => ({ error: null })),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
  signInWithGoogle: vi.fn(async () => ({ error: null })),
  updateUser: vi.fn(async () => ({ error: null })),
}));

vi.mock("@tanstack/react-router", async () => {
  const React = await import("react");
  return {
    createFileRoute: () => (options: Record<string, unknown>) => ({
      ...options,
      options,
      useSearch: () => ({ mode: mocks.mode }),
    }),
    useNavigate: () => mocks.navigate,
    Link: ({
      to,
      search,
      children,
      ...props
    }: {
      to: string;
      search?: Record<string, string>;
      children: React.ReactNode;
    }) => {
      const query = Object.entries(search ?? {})
        .map(([key, value]) => `${key}=${value}`)
        .join("&");
      return React.createElement("a", { href: query ? `${to}?${query}` : to, ...props }, children);
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      signOut: mocks.signOut,
      updateUser: mocks.updateUser,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));

vi.mock("@/lib/oauth", () => ({
  signInWithGoogle: mocks.signInWithGoogle,
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    lang: "fr",
    setLang: vi.fn(),
    errMsg: (error: unknown) => String(error),
    t: (key: string) =>
      ({
        "auth.loginTitle": "Bon retour !",
        "auth.loginDescription": "Connectez-vous à votre compte EXAMPRO.",
        "auth.signupTitle": "Créez votre compte EXAMPRO",
        "auth.signupDescription": "Choisissez votre rôle à l’étape suivante.",
        "auth.forgotTitle": "Réinitialiser le mot de passe",
        "auth.forgotDescription": "Recevez un lien de réinitialisation.",
        "auth.resetPasswordDescription": "Choisissez un nouveau mot de passe.",
        "auth.brandDescription": "Apprenez et réussissez.",
        "auth.brandCourses": "Cours de qualité",
        "auth.brandQuizzes": "Quiz interactifs",
        "auth.brandExams": "Examens réels",
        "auth.brandProgress": "Suivi de progression",
        "auth.showPassword": "Afficher le mot de passe",
        "auth.hidePassword": "Masquer le mot de passe",
        "auth.password": "Mot de passe",
        "auth.newPassword": "Nouveau mot de passe",
        "auth.savePassword": "Enregistrer le mot de passe",
        "auth.confirmPassword": "Confirmer le mot de passe",
        "auth.email": "Adresse e-mail",
        "auth.firstName": "Prénom",
        "auth.lastName": "Nom de famille",
        "auth.submitLogin": "Se connecter",
        "auth.submitSignup": "Créer mon compte",
        "auth.sendReset": "Envoyer le lien",
        "auth.google": "Continuer avec Google",
        "auth.or": "ou",
        "auth.noAccount": "Pas encore de compte ?",
        "auth.haveAccount": "Déjà inscrit ?",
        "auth.forgot": "Mot de passe oublié ?",
        "auth.passwordMismatch": "Les mots de passe ne correspondent pas.",
        "auth.nameTooLong": "Le nom est trop long.",
        "auth.checkEmail": "Vérifiez votre boîte e-mail.",
        "auth.resetSent": "E-mail envoyé.",
        "auth.emailRejected": "Adresse e-mail rejetée.",
        "auth.unauthorized": "Accès non autorisé.",
        "auth.back": "Retour à la connexion",
        "nav.signup": "Créer un compte",
        "nav.login": "Se connecter",
        "onb.nameRequired": "Entrez votre prénom et votre nom.",
        "brand.tagline": "Apprendre · Pratiquer · Réussir",
        "landing.title": "Préparez vos examens officiels avec méthode.",
        "lang.label": "Langue",
      })[key] ?? key,
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderAuth() {
  const AuthPage = Route.options.component;
  if (!AuthPage) throw new Error("Auth route component is not configured");
  return render(<AuthPage />);
}

describe("authentication page UI", () => {
  beforeEach(() => {
    mocks.mode = "login";
    mocks.navigate.mockReset();
    mocks.getSession.mockClear();
    mocks.getUser.mockClear();
    mocks.signInWithPassword.mockReset().mockResolvedValue({ error: null });
    mocks.signUp.mockReset().mockResolvedValue({ data: { session: null }, error: null });
    mocks.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
    mocks.signInWithGoogle.mockReset().mockResolvedValue({ error: null });
  });

  it("uses the supported language codes in the language selector", () => {
    renderAuth();
    const languageSelector = screen.getByRole("group", { name: "Langue" });

    expect(screen.getByRole("button", { name: "FR" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "HT" })).toBeInTheDocument();
    expect(languageSelector).not.toHaveTextContent("KR");
  });

  it("keeps email/password login and provides a password visibility toggle", async () => {
    renderAuth();
    const password = screen.getByLabelText("Mot de passe");

    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(password).toHaveAttribute("type", "text");

    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "  STUDENT@example.com " },
    });
    fireEvent.change(password, { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() =>
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: "student@example.com",
        password: "password123",
      }),
    );
  });

  it("keeps Google OAuth available from the shared login screen", async () => {
    renderAuth();
    fireEvent.click(screen.getByRole("button", { name: /Continuer avec Google/ }));

    await waitFor(() => expect(mocks.signInWithGoogle).toHaveBeenCalled());
  });

  it("retains the signup identity fields and password confirmation validation", async () => {
    mocks.mode = "signup";
    renderAuth();

    expect(screen.getByRole("heading", { name: "Créez votre compte EXAMPRO" })).toBeInTheDocument();
    expect(screen.getByLabelText("Prénom")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom de famille")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmer le mot de passe")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Nom de famille"), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), {
      target: { value: "different123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByText("Les mots de passe ne correspondent pas.")).toBeInTheDocument();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("preserves Supabase registration metadata and onboarding email redirect", async () => {
    mocks.mode = "signup";
    renderAuth();
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Nom de famille"), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    await waitFor(() =>
      expect(mocks.signUp).toHaveBeenCalledWith({
        email: "ada@example.com",
        password: "password123",
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: {
            first_name: "Ada",
            last_name: "Lovelace",
            full_name: "Ada Lovelace",
            language: "fr",
          },
        },
      }),
    );
  });

  it("preserves password recovery mode", async () => {
    mocks.mode = "forgot";
    renderAuth();

    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "student@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }));

    await waitFor(() =>
      expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
        "student@example.com",
        expect.objectContaining({ redirectTo: `${window.location.origin}/reset-password` }),
      ),
    );
  });

  it("updates the password through Supabase from the shared reset screen", async () => {
    const ResetPassword = ResetPasswordRoute.options.component;
    if (!ResetPassword) throw new Error("Reset password route component is not configured");
    render(<ResetPassword />);

    fireEvent.change(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "new-password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le mot de passe" }));

    await waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({ password: "new-password123" });
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
  });
});
