import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/Brand";
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
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(t("auth.passwordUpdated"));
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <BrandLogo className="h-10" />
      <form onSubmit={submit} className="card-surface flex w-full max-w-sm flex-col gap-4 p-6">
        <h1 className="text-xl font-bold">{t("auth.forgotTitle")}</h1>
        <div className="grid gap-1.5">
          <Label htmlFor="pw">{t("auth.newPassword")}</Label>
          <Input id="pw" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </div>
        <Button type="submit" disabled={busy}>{t("auth.savePassword")}</Button>
      </form>
    </div>
  );
}
