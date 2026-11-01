import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, subjectsForLevel, trackFilter } from "@/lib/catalog";
import { openExamFile } from "@/lib/files";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { NativeSelect } from "@/components/Field";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/exams")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { subject?: string | undefined; year?: number | undefined } => ({
    subject: typeof s["subject"] === "string" ? s["subject"] : undefined,
    year: typeof s["year"] === "number" ? s["year"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Archive des examens — EXAMPRO" }] }),
  component: Exams,
});

function Exams() {
  const { t, name, errMsg } = useI18n();
  const { subject, year } = Route.useSearch();
  const navigate = useNavigate({ from: "/exams" });
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  const levelId = me?.profile?.level_id;
  const trackId = me?.profile?.track_id;

  const q = useQuery({
    queryKey: ["exams", levelId, trackId, subject, year],
    enabled: !!levelId,
    queryFn: async () => {
      let qq = supabase
        .from("exams")
        .select("id,title,description,exam_year,session,subject_id,file_path")
        .eq("status", "published")
        .eq("level_id", levelId!)
        .or(trackFilter(trackId));
      if (subject) qq = qq.eq("subject_id", subject);
      if (year) qq = qq.eq("exam_year", year);
      const { data, error } = await qq.order("exam_year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (cat.isLoading) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} />;
  const c = cat.data;
  const subjects = subjectsForLevel(c, levelId, trackId);
  const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div>
      <PageHeader title={t("exams.title")} subtitle={t("exams.subtitle")} />
      <div className="mb-6 flex flex-wrap gap-3">
        <NativeSelect
          aria-label={t("exams.subject")}
          className="w-auto"
          value={subject ?? ""}
          onChange={(e) =>
            navigate({ search: (p) => ({ ...p, subject: e.target.value || undefined }) })
          }
        >
          <option value="">
            {t("exams.subject")} : {t("common.all")}
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {name(s)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={t("exams.year")}
          className="w-auto"
          value={year ?? ""}
          onChange={(e) =>
            navigate({
              search: (p) => ({ ...p, year: e.target.value ? Number(e.target.value) : undefined }),
            })
          }
        >
          <option value="">
            {t("exams.year")} : {t("common.all")}
          </option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </NativeSelect>
      </div>
      {!levelId ? (
        <Empty>{t("subj.empty")}</Empty>
      ) : q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <Empty>{t("exams.empty")}</Empty>
      ) : (
        <div className="grid gap-3">
          {q.data.map((x) => {
            const s = c.subjects.find((y) => y.id === x.subject_id);
            return (
              <div key={x.id} className="card-surface flex flex-wrap items-center gap-4 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-heading">{x.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {s ? name(s) : ""} · {x.exam_year}
                    {x.session ? ` · ${x.session}` : ""}
                  </p>
                  {x.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{x.description}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => openExamFile(x.file_path).catch((e) => toast.error(errMsg(e)))}
                >
                  {t("exams.view")}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
