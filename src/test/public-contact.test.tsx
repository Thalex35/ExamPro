import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { PublicContactForm } from "@/components/PublicContactForm";
import { I18nProvider } from "@/lib/i18n";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke } },
}));

function renderContactForm() {
  return render(
    <I18nProvider>
      <LanguageSwitch />
      <PublicContactForm />
    </I18nProvider>,
  );
}

function fillFrenchForm() {
  fireEvent.change(screen.getByLabelText("Nom complet"), { target: { value: "  Jean Pierre  " } });
  fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
    target: { value: "jean@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Votre message"), {
    target: { value: "Bonjour EXAMPRO" },
  });
}

describe("public contact form", () => {
  beforeEach(() => {
    invoke.mockReset();
    window.localStorage.clear();
  });

  it("reports all required fields and does not submit an empty form", () => {
    renderContactForm();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(screen.getAllByText("Ce champ est obligatoire.")).toHaveLength(3);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("validates the email format before submission", () => {
    renderContactForm();
    fireEvent.change(screen.getByLabelText("Nom complet"), { target: { value: "Jean Pierre" } });
    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByLabelText("Votre message"), { target: { value: "Bonjour" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(screen.getByText("Entrez une adresse e-mail valide.")).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("disables duplicate submissions, sends only the three fields, and shows success", async () => {
    let resolveRequest!: (value: { data: { success: boolean }; error: null }) => void;
    invoke.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    renderContactForm();
    fillFrenchForm();

    fireEvent.click(screen.getByRole("button", { name: "Envoyer le message" }));
    expect(screen.getByRole("button", { name: "Envoi en cours…" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("button", { name: "Envoi en cours…" }).closest("form")!);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("contact", {
      body: { name: "Jean Pierre", email: "jean@example.com", message: "Bonjour EXAMPRO" },
    });

    resolveRequest({ data: { success: true }, error: null });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Votre message a bien été envoyé."),
    );
    expect(screen.getByLabelText("Nom complet")).toHaveValue("");
  });

  it("shows an error instead of success when the submission fails", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("backend unavailable") });
    renderContactForm();
    fillFrenchForm();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nous n’avons pas pu envoyer votre message. Veuillez réessayer.",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("requires a success confirmation from the function before showing success", async () => {
    invoke.mockResolvedValue({ data: { success: false }, error: null });
    renderContactForm();
    fillFrenchForm();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("translates all three fields and feedback into Haitian Creole", async () => {
    renderContactForm();
    fireEvent.click(screen.getByRole("button", { name: "KR" }));

    expect(await screen.findByLabelText("Non konplè")).toBeInTheDocument();
    expect(screen.getByLabelText("Adrès imèl")).toHaveAttribute(
      "placeholder",
      "Ekri adrès imèl ou",
    );
    expect(screen.getByLabelText("Mesaj ou")).toHaveAttribute("placeholder", "Ekri mesaj ou la...");
    expect(screen.getByRole("button", { name: "Voye mesaj la" })).toBeInTheDocument();
  });
});
