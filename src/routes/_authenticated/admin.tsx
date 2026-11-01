import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, chaptersFor, topicsFor, type Catalog } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { useMe, type Role } from "@/lib/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, StatusBadge } from "@/components/Field";
import { ErrorState, Loading, PageHeader, Empty } from "@/components/States";
import { AdminGate } from "@/components/TeacherGate";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administration — EXAMPRO" }] }),
  component: Admin,
});

function Admin() {
  const { t } = useI18n();
  return (
    <AdminGate>
      <PageHeader title={t("admin.title")} />
      <Tabs defaultValue="catalog">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="catalog">{t("admin.catalog")}</TabsTrigger>
          <TabsTrigger value="users">{t("admin.users")}</TabsTrigger>
          <TabsTrigger value="content">{t("admin.content")}</TabsTrigger>
          <TabsTrigger value="schools">{t("admin.schools")}</TabsTrigger>
          <TabsTrigger value="teacher-verification">{t("admin.teacherVerification")}</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog" className="mt-6"><CatalogAdmin /></TabsContent>
        <TabsContent value="users" className="mt-6"><UsersAdmin /></TabsContent>
        <TabsContent value="content" className="mt-6"><ContentAdmin /></TabsContent>
        <TabsContent value="schools" className="mt-6"><SchoolReviewAdmin /></TabsContent>
        <TabsContent value="teacher-verification" className="mt-6"><TeacherVerificationAdmin /></TabsContent>
      </Tabs>
    </AdminGate>
  );
}

function NameInputs({ onSubmit }: { onSubmit: (fr: string, ht: string) => Promise<boolean> }) {
  const { t } = useI18n();
  const [fr, setFr] = useState("");
  const [ht, setHt] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await onSubmit(fr.trim(), (ht || fr).trim())) { setFr(""); setHt(""); }
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <Input required placeholder={t("admin.nameFr")} value={fr} onChange={(e) => setFr(e.target.value)} className="w-44" />
      <Input placeholder={t("admin.nameHt")} value={ht} onChange={(e) => setHt(e.target.value)} className="w-44" />
      <Button type="submit" size="sm" className="h-9">{t("admin.add")}</Button>
    </form>
  );
}

function CatalogAdmin() {
  const { t, name, errMsg } = useI18n();
  const qc = useQueryClient();
  const cat = useQuery(catalogQuery);
  const [levelId, setLevelId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  if (cat.isLoading) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} />;
  const c: Catalog = cat.data;
  const refresh = () => qc.invalidateQueries({ queryKey: ["catalog"] });
  const run = async (p: PromiseLike<{ error: unknown }>) => {
    const { error } = await p;
    if (error) { toast.error(errMsg(error)); return false; }
    toast.success(t("common.saved"));
    refresh();
    return true;
  };
  const lvl = levelId || c.levels[0]?.id;
  const level = c.levels.find((l) => l.id === lvl);
  const linked = new Set(c.levelSubjects.filter((x) => x.level_id === lvl).map((x) => x.subject_id));
  const chapters = chaptersFor(c, subjectId, lvl);
  const topics = topicsFor(c, chapterId);

  return (
    <div className="grid gap-6">
      <div className="card-surface p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">{t("form.level")}</span>
          <NativeSelect className="w-auto" value={lvl} onChange={(e) => { setLevelId(e.target.value); setSubjectId(""); setChapterId(""); }}>
            {c.levels.map((l) => <option key={l.id} value={l.id}>{name(l)}</option>)}
          </NativeSelect>
        </div>
        <h3 className="mb-2 font-semibold">{t("nav.subjects")}</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {c.subjects.map((s) => (
            <div key={s.id} className="rounded-lg border p-3 text-sm">
              <label className="flex items-center gap-2 font-medium">
                <input type="checkbox" checked={linked.has(s.id)} onChange={(e) => run(e.target.checked ? supabase.from("level_subjects").insert({ level_id: lvl!, subject_id: s.id }) : supabase.from("level_subjects").delete().eq("level_id", lvl!).eq("subject_id", s.id))} />
                {name(s)}
              </label>
              {level?.requires_track && linked.has(s.id) && (
                <div className="mt-2 flex flex-wrap gap-2 pl-6">
                  {c.tracks.filter((tr) => tr.level_id === lvl).map((tr) => {
                    const on = c.trackSubjects.some((x) => x.track_id === tr.id && x.subject_id === s.id);
                    return (
                      <label key={tr.id} className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={on} onChange={(e) => run(e.target.checked ? supabase.from("track_subjects").insert({ track_id: tr.id, subject_id: s.id }) : supabase.from("track_subjects").delete().eq("track_id", tr.id).eq("subject_id", s.id))} />
                        {tr.code}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm text-muted-foreground">{t("admin.add")} — {t("form.subject")}</p>
          <NameInputs onSubmit={(fr, ht) => run(supabase.from("subjects").insert({ name_fr: fr, name_ht: ht, slug: fr.toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-") + "-" + Date.now().toString(36) }))} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-5">
          <h3 className="mb-3 font-semibold">{t("subj.chapters")}</h3>
          <NativeSelect value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setChapterId(""); }} className="mb-3">
            <option value="">{t("form.subject")}…</option>
            {c.subjects.filter((s) => linked.has(s.id)).map((s) => <option key={s.id} value={s.id}>{name(s)}</option>)}
          </NativeSelect>
          {subjectId && (
            <>
              <ul className="mb-3 divide-y rounded-lg border">
                {chapters.length === 0 && <li className="p-3 text-sm text-muted-foreground">{t("subj.noChapters")}</li>}
                {chapters.map((ch) => (
                  <li key={ch.id} className="flex items-center gap-2 p-2 text-sm">
                    <button className={`flex-1 text-left ${chapterId === ch.id ? "font-semibold text-deep" : ""}`} onClick={() => setChapterId(ch.id)}>{name(ch)}</button>
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={ch.verified} onChange={(e) => run(supabase.from("chapters").update({ verified: e.target.checked }).eq("id", ch.id))} />✓</label>
                    <button aria-label={t("common.delete")} onClick={() => confirm(t("common.delete") + " ?") && run(supabase.from("chapters").delete().eq("id", ch.id))}><Trash2 className="h-4 w-4 text-destructive" /></button>
                  </li>
                ))}
              </ul>
              <NameInputs onSubmit={(fr, ht) => run(supabase.from("chapters").insert({ subject_id: subjectId, level_id: lvl!, name_fr: fr, name_ht: ht, sort_order: chapters.length + 1 }))} />
            </>
          )}
        </div>
        <div className="card-surface p-5">
          <h3 className="mb-3 font-semibold">{t("form.topic")}</h3>
          {!chapterId ? <p className="text-sm text-muted-foreground">{t("form.chapter")}…</p> : (
            <>
              <ul className="mb-3 divide-y rounded-lg border">
                {topics.map((tp) => (
                  <li key={tp.id} className="flex items-center gap-2 p-2 text-sm">
                    <span className="flex-1">{name(tp)}</span>
                    <button aria-label={t("common.delete")} onClick={() => confirm(t("common.delete") + " ?") && run(supabase.from("topics").delete().eq("id", tp.id))}><Trash2 className="h-4 w-4 text-destructive" /></button>
                  </li>
                ))}
              </ul>
              <NameInputs onSubmit={(fr, ht) => run(supabase.from("topics").insert({ chapter_id: chapterId, name_fr: fr, name_ht: ht, sort_order: topics.length + 1 }))} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersAdmin() {
  const { t, errMsg } = useI18n();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [p, r] = await Promise.all([supabase.from("profiles").select("id,full_name,school,created_at").order("created_at", { ascending: false }), supabase.from("user_roles").select("user_id,role")]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      return p.data.map((u) => ({ ...u, roles: r.data.filter((x) => x.user_id === u.id).map((x) => x.role as Role) }));
    },
  });
  async function toggle(userId: string, role: Role, enabled: boolean) {
    const { error } = await supabase.rpc("admin_set_role", { _user_id: userId, _role: role, _enabled: enabled });
    if (error) { toast.error(errMsg(error)); return; }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} />;
  return (
    <div className="card-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">{t("auth.fullName")}</th><th className="p-3">{t("admin.roles")}</th></tr></thead>
        <tbody className="divide-y">
          {q.data!.map((u) => (
            <tr key={u.id}>
              <td className="p-3 font-medium text-heading">{u.full_name ?? "—"}{u.id === me?.user.id ? " (vous)" : ""}</td>
              <td className="p-3">
                <div className="flex flex-wrap gap-3">
                  {(["student", "teacher", "admin"] as Role[]).map((r) => (
                    <label key={r} className="flex items-center gap-1">
                      <input type="checkbox" checked={u.roles.includes(r)} onChange={(e) => toggle(u.id, r, e.target.checked)} /> {r}
                    </label>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContentAdmin() {
  const { t, errMsg } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-content"],
    queryFn: async () => {
      const [c, e] = await Promise.all([supabase.from("courses").select("id,title,status,updated_at").order("updated_at", { ascending: false }).limit(100), supabase.from("exams").select("id,title,status,exam_year").order("created_at", { ascending: false }).limit(100)]);
      if (c.error) throw c.error;
      if (e.error) throw e.error;
      return [...c.data.map((x) => ({ ...x, kind: "courses" as const })), ...e.data.map((x) => ({ ...x, kind: "exams" as const }))];
    },
  });
  async function setStatus(kind: "courses" | "exams", id: string, status: "draft" | "published" | "archived") {
    const { error } = await supabase.from(kind).update({ status }).eq("id", id);
    if (error) { toast.error(errMsg(error)); return; }
    qc.invalidateQueries();
  }
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data!.length) return <Empty>{t("teacher.empty")}</Empty>;
  return (
    <ul className="card-surface divide-y">
      {q.data!.map((x) => (
        <li key={x.kind + x.id} className="flex flex-wrap items-center gap-3 p-4">
          <span className="w-16 text-xs uppercase text-muted-foreground">{x.kind === "courses" ? t("subj.courses") : t("nav.exams")}</span>
          <span className="flex-1 font-medium text-heading">{x.title}</span>
          <StatusBadge status={x.status} label={t(`status.${x.status}`)} />
          {x.status === "published" ? (
            <Button size="sm" variant="outline" onClick={() => setStatus(x.kind, x.id, "archived")}>{t("form.unpublish")}</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setStatus(x.kind, x.id, "published")}>{t("form.publish")}</Button>
          )}
        </li>
      ))}
    </ul>
  );
}

function SchoolReviewAdmin() {
  const { t, errMsg } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-schools-review"],
    queryFn: async () => {
      const [schools, corrections, allSchools] = await Promise.all([
        supabase
          .from("schools")
          .select("id,name,geographical_department,phone,email,created_at")
          .eq("verification_status", "pending")
          .order("created_at", { ascending: true }),
        supabase
          .from("school_contact_corrections")
          .select("id,school_id,proposed_phone,proposed_email,created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: true }),
        supabase.from("schools").select("id,name,geographical_department"),
      ]);
      if (schools.error) throw schools.error;
      if (corrections.error) throw corrections.error;
      if (allSchools.error) throw allSchools.error;
      return { schools: schools.data, corrections: corrections.data, allSchools: allSchools.data };
    },
  });

  async function reviewSchool(id: string, status: "verified" | "rejected") {
    const { error } = await supabase.rpc("admin_review_school", {
      _school_id: id,
      _status: status,
    });
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success(t("admin.reviewed"));
    await qc.invalidateQueries({ queryKey: ["admin-schools-review"] });
  }

  async function reviewCorrection(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.rpc("admin_review_school_contact_correction", {
      _correction_id: id,
      _status: status,
      _review_note: null,
    });
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success(t("admin.reviewed"));
    await qc.invalidateQueries({ queryKey: ["admin-schools-review"] });
  }

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  const schoolNames = new Map(q.data.allSchools.map((school) => [school.id, school]));

  return (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("admin.pendingSchools")}</h2>
        {q.data.schools.length ? (
          <ul className="card-surface divide-y">
            {q.data.schools.map((school) => (
              <li key={school.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-heading">{school.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {school.geographical_department}
                    {school.phone ? ` · ${school.phone}` : ""}
                    {school.email ? ` · ${school.email}` : ""}
                  </p>
                </div>
                <Button size="sm" onClick={() => void reviewSchool(school.id, "verified")}>
                  {t("admin.approve")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void reviewSchool(school.id, "rejected")}>
                  {t("admin.reject")}
                </Button>
              </li>
            ))}
          </ul>
        ) : <Empty>{t("admin.noPendingSchools")}</Empty>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("admin.contactCorrections")}</h2>
        {q.data.corrections.length ? (
          <ul className="card-surface divide-y">
            {q.data.corrections.map((correction) => {
              const school = schoolNames.get(correction.school_id);
              return (
                <li key={correction.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-heading">{school?.name ?? correction.school_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {correction.proposed_phone ?? "—"} · {correction.proposed_email ?? "—"}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => void reviewCorrection(correction.id, "approved")}>
                    {t("admin.approve")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void reviewCorrection(correction.id, "rejected")}>
                    {t("admin.reject")}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : <Empty>{t("admin.noPendingCorrections")}</Empty>}
      </section>
    </div>
  );
}

function TeacherVerificationAdmin() {
  const { t, errMsg } = useI18n();
  const qc = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const q = useQuery({
    queryKey: ["admin-teacher-verification"],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from("teacher_verification_requests")
        .select("id,teacher_id,email,school_id,submitted_at")
        .eq("status", "pending")
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      if (!requests.length) return { requests, profiles: [], schools: [] };
      const [profiles, schools] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,first_name,last_name,full_name,phone")
          .in("id", requests.map((request) => request.teacher_id)),
        supabase
          .from("schools")
          .select("id,name,geographical_department,verification_status")
          .in("id", requests.flatMap((request) => request.school_id ? [request.school_id] : [])),
      ]);
      if (profiles.error) throw profiles.error;
      if (schools.error) throw schools.error;
      return { requests, profiles: profiles.data, schools: schools.data };
    },
  });

  async function review(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.rpc("admin_review_teacher_verification", {
      _request_id: id,
      _status: status,
      _review_note: reviewNotes[id]?.trim() || null,
    });
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    toast.success(t("admin.reviewed"));
    await qc.invalidateQueries({ queryKey: ["admin-teacher-verification"] });
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  if (!q.data.requests.length) return <Empty>{t("admin.noPendingTeachers")}</Empty>;
  const profilesById = new Map(q.data.profiles.map((profile) => [profile.id, profile]));
  const schoolsById = new Map(q.data.schools.map((school) => [school.id, school]));

  return (
    <ul className="card-surface divide-y">
      {q.data.requests.map((request) => {
        const profile = profilesById.get(request.teacher_id);
        const school = request.school_id ? schoolsById.get(request.school_id) : null;
        const schoolStatusLabel = school
          ? school.verification_status === "verified"
            ? t("admin.schoolStatus.verified")
            : school.verification_status === "rejected"
              ? t("admin.schoolStatus.rejected")
              : t("admin.schoolStatus.pending")
          : null;
        const teacherName =
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
          profile?.full_name ||
          request.email;
        return (
          <li key={request.id} className="grid gap-3 p-4">
            <div>
              <p className="font-semibold text-heading">{teacherName}</p>
              <p className="text-sm text-muted-foreground">
                {request.email} · {profile?.phone ?? "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {school ? `${school.name} · ${school.geographical_department} · ${schoolStatusLabel}` : "—"}
              </p>
            </div>
            {school?.verification_status !== "verified" && (
              <p className="text-sm text-muted-foreground">{t("admin.schoolMustBeVerified")}</p>
            )}
            <Input
              aria-label={t("admin.reviewNote")}
              placeholder={t("admin.reviewNote")}
              maxLength={500}
              value={reviewNotes[request.id] ?? ""}
              onChange={(event) =>
                setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))
              }
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                disabled={!school || school.verification_status !== "verified"}
                onClick={() => void review(request.id, "approved")}
              >
                {t("admin.approve")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void review(request.id, "rejected")}>
                {t("admin.reject")}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
