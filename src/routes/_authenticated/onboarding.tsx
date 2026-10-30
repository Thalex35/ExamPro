import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { GraduationCap, PenSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, tracksFor } from "@/lib/catalog";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/Field";
import { ErrorState, Loading } from "@/components/States";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Profil — EXAMPRO" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { t, name, errMsg } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [fullName, setFullName] = useState("");
  const [levelId, setLevelId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [school, setSchool] = useState("");
  const [department, setDepartment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me?.profile?.full_name && !fullName) setFullName(me.profile.full_name);
    if (me?.profile?.onboarded) navigate({ to: me.isTeacher ? "/teacher" : "/dashboard", replace: true });
  }, [me]); // eslint-disable-line react-hooks/exhaustive-deps

  if (cat.isLoading) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} onRetry={() => cat.refetch()} />;
  const c = cat.data;
  const level = c.levels.find((l) => l.id === levelId);
  const tracks = tracksFor(c, levelId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("complete_onboarding", {
      _role: role,
      _full_name: fullName,
      _level_id: role === "student" ? levelId || null : null,
      _track_id: role === "student" && level?.requires_track ? trackId || null : null,
      _subject_ids: role === "teacher" ? subjects : [],
      _school: school,
      _department: department,
    } as never);
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    await qc.invalidateQueries({ queryKey: ["me"] });
    navigate({ to: role === "teacher" ? "/teacher" : "/dashboard", replace: true });
  }

  const roleCard = (r: "student" | "teacher", Icon: typeof GraduationCap, title: string, desc: string) => (
    <button
      type="button"
      onClick={() => setRole(r)}
      aria-pressed={role === r}
      className={cn("flex flex-1 items-start gap-3 rounded-xl border-2 bg-card p-4 text-left transition-colors", role === r ? "border-brand" : "border-border hover:border-brand/50")}
    >
      <Icon className="mt-0.5 h-5 w-5 text-deep" />
      <span>
        <span className="block font-semibold text-heading">{title}</span>
        <span className="text-sm text-muted-foreground">{desc}</span>
      </span>
    </button>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold sm:text-3xl">{t("onb.title")}</h1>
      <form onSubmit={submit} className="card-surface mt-6 flex flex-col gap-5 p-6">
        <div>
          <p className="mb-2 text-sm font-medium">{t("onb.iam")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {roleCard("student", GraduationCap, t("onb.student"), t("onb.studentD"))}
            {roleCard("teacher", PenSquare, t("onb.teacher"), t("onb.teacherD"))}
          </div>
        </div>
        <Field label={t("auth.fullName")} htmlFor="fn">
          <Input id="fn" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        {role === "student" ? (
          <>
            <Field label={t("onb.level")} htmlFor="lvl">
              <NativeSelect id="lvl" required value={levelId} onChange={(e) => { setLevelId(e.target.value); setTrackId(""); }}>
                <option value="">{t("common.select")}</option>
                {c.levels.map((l) => <option key={l.id} value={l.id}>{name(l)}</option>)}
              </NativeSelect>
            </Field>
            {level?.requires_track && (
              <Field label={t("onb.track")} htmlFor="trk" hint={t("onb.trackHint")}>
                <NativeSelect id="trk" required value={trackId} onChange={(e) => setTrackId(e.target.value)}>
                  <option value="">{t("common.select")}</option>
                  {tracks.map((tr) => <option key={tr.id} value={tr.id}>{tr.code} — {name(tr)}</option>)}
                </NativeSelect>
              </Field>
            )}
          </>
        ) : (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("onb.subjects")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {c.subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                  <input type="checkbox" checked={subjects.includes(s.id)} onChange={(e) => setSubjects((p) => (e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id)))} />
                  {name(s)}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("onb.school")} htmlFor="sch"><Input id="sch" value={school} onChange={(e) => setSchool(e.target.value)} /></Field>
          <Field label={t("onb.department")} htmlFor="dep"><Input id="dep" value={department} onChange={(e) => setDepartment(e.target.value)} /></Field>
        </div>
        <Button type="submit" size="lg" disabled={busy}>{t("onb.submit")}</Button>
      </form>
    </div>
  );
}
