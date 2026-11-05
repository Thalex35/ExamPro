import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AuthLayout, AuthPasswordField } from "@/components/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — EXAMPRO" },
      { name: "description", content: "Choisissez un nouveau mot de passe EXAMPRO." },
      { property: "og:title", content: "Nouveau mot de passe — EXAMPRO" },
      { property: "og:description", content: "Réinitialisation du mot de passe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { t, errMsg } = useI18n();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success(t("auth.passwordUpdated"));
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthLayout>
      <div className="w-full rounded-3xl border border-sky-100 bg-card p-5 shadow-[0_16px_48px_-28px_rgba(7,37,86,0.28)] sm:p-8 lg:p-10">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-heading sm:text-3xl">
            {t("auth.forgotTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("auth.resetPasswordDescription")}
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <AuthPasswordField
            id="pw"
            label={t("auth.newPassword")}
            value={pw}
            onChange={setPw}
            minLength={8}
            autoComplete="new-password"
          />
          <Button type="submit" disabled={busy} size="lg" className="h-12 w-full rounded-xl">
            {t("auth.savePassword")}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
