import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, tracksFor } from "@/lib/catalog";
import { useMe } from "@/lib/session";
import { useI18n, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/Field";
import { Loading, PageHeader } from "@/components/States";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Mon profil — EXAMPRO" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, name, errMsg, setLang } = useI18n();
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [language, setLanguage] = useState<Lang>("fr");
  const [levelId, setLevelId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!me?.profile) return;
    setFullName(me.profile.full_name ?? "");
    setSchool(me.profile.school ?? "");
    setLanguage(me.profile.language as Lang);
    setLevelId(me.profile.level_id ?? "");
    setTrackId(me.profile.track_id ?? "");
  }, [me?.profile]);

  if (!me || cat.isLoading || !cat.data) return <Loading />;
  const c = cat.data;
  const level = c.levels.find((l) => l.id === levelId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const patch: { full_name: string; school: string | null; language: string; updated_at: string; level_id?: string; track_id?: string | null } = { full_name: fullName.trim(), school: school.trim() || null, language, updated_at: new Date().toISOString() };
    if (me!.isStudent) {
      if (level?.requires_track && !trackId) { setBusy(false); { toast.error(errMsg("TRACK_REQUIRED")); return; } }
      patch.level_id = levelId;
      patch.track_id = level?.requires_track ? trackId : null;
    }
    const { error } = await supabase.from("profiles").update(patch).eq("id", me!.user.id);
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    setLang(language);
    toast.success(t("common.saved"));
    qc.invalidateQueries();
  }

  async function signOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    await qc.cancelQueries();
    qc.clear();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("profile.title")} subtitle={me.user.email ?? ""} />
      <form onSubmit={submit} className="card-surface flex flex-col gap-5 p-6">
        <Field label={t("auth.fullName")} htmlFor="p-name"><Input id="p-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label={t("onb.school")} htmlFor="p-school"><Input id="p-school" value={school} onChange={(e) => setSchool(e.target.value)} /></Field>
        <Field label={t("lang.label")} htmlFor="p-lang">
          <NativeSelect id="p-lang" value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
            <option value="fr">Français</option>
            <option value="ht">Kreyòl</option>
          </NativeSelect>
        </Field>
        {me.isStudent && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("onb.level")} htmlFor="p-level">
              <NativeSelect id="p-level" value={levelId} onChange={(e) => { setLevelId(e.target.value); setTrackId(""); }}>
                {c.levels.map((l) => <option key={l.id} value={l.id}>{name(l)}</option>)}
              </NativeSelect>
            </Field>
            {level?.requires_track && (
              <Field label={t("onb.track")} htmlFor="p-track" hint={t("onb.trackHint")}>
                <NativeSelect id="p-track" required value={trackId} onChange={(e) => setTrackId(e.target.value)}>
                  <option value="">{t("common.select")}</option>
                  {tracksFor(c, levelId).map((tr) => <option key={tr.id} value={tr.id}>{tr.code} — {name(tr)}</option>)}
                </NativeSelect>
              </Field>
            )}
          </div>
        )}
        <div className="flex justify-end"><Button type="submit" disabled={busy}>{t("common.save")}</Button></div>
      </form>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="outline" onClick={() => void signOut()} disabled={signingOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("nav.logout")}
        </Button>
      </div>
    </div>
  );
}
