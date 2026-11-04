import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Atom,
  BookOpen,
  Brain,
  Calculator,
  Dna,
  FileText,
  FlaskConical,
  Globe,
  GraduationCap,
  Languages,
  Leaf,
  Mountain,
  Palette,
  Play,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Empty, ErrorState, Loading } from "@/components/States";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, chaptersFor, subjectsForLevel, trackFilter } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

const subjectIcons: Record<string, LucideIcon> = {
  calculator: Calculator,
  atom: Atom,
  dna: Dna,
  leaf: Leaf,
  flask: FlaskConical,
  mountain: Mountain,
  languages: Languages,
  "book-open": BookOpen,
  brain: Brain,
  palette: Palette,
  globe: Globe,
  "trending-up": TrendingUp,
  activity: Activity,
};

function countBySubject(resources: { subject_id: string }[]) {
  return resources.reduce<Record<string, number>>((counts, resource) => {
    counts[resource.subject_id] = (counts[resource.subject_id] ?? 0) + 1;
    return counts;
  }, {});
}

export const Route = createFileRoute("/_authenticated/subjects/")({
  head: () => ({ meta: [{ title: "Matières — EXAMPRO" }] }),
  component: Subjects,
});

function Subjects() {
  const { t, name } = useI18n();
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  const levelId = me?.profile?.level_id;
  const trackId = me?.profile?.track_id;
  const resources = useQuery({
    queryKey: ["subject-resource-counts", levelId, trackId],
    enabled: !!levelId,
    queryFn: async () => {
      if (!levelId) return { courses: {}, exams: {} };
      const filter = trackFilter(trackId);
      const [courses, exams] = await Promise.all([
        supabase
          .from("courses")
          .select("subject_id")
          .eq("status", "published")
          .eq("level_id", levelId)
          .or(filter),
        supabase
          .from("exams")
          .select("subject_id")
          .eq("status", "published")
          .eq("level_id", levelId)
          .or(filter),
      ]);
      if (courses.error) throw courses.error;
      if (exams.error) throw exams.error;
      return {
        courses: countBySubject(courses.data),
        exams: countBySubject(exams.data),
      };
    },
  });

  if (cat.isLoading) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} onRetry={() => cat.refetch()} />;
  const catalog = cat.data;
  const levelIdInProfile = me?.profile?.level_id;
  const trackIdInProfile = me?.profile?.track_id;
  const level = catalog.levels.find((item) => item.id === levelIdInProfile);
  const track = catalog.tracks.find(
    (item) => item.id === trackIdInProfile && item.level_id === levelIdInProfile,
  );
  const subjects = subjectsForLevel(catalog, levelIdInProfile, trackIdInProfile);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.9fr)_minmax(24rem,1.1fr)] xl:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-deep">
            <BookOpen className="h-7 w-7" aria-hidden="true" />
          </span>
          <span>
            <h1 className="text-2xl font-bold sm:text-3xl">{t("subj.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {level
                ? `${t("subj.subtitle")} — ${name(level)}${track ? ` · ${track.code}` : ""}`
                : t("subj.subtitle")}
            </p>
          </span>
        </div>
        <section className="relative isolate flex min-h-28 items-center justify-between overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-100 px-5 py-5 shadow-sm sm:px-7">
          <div className="relative z-10 max-w-md">
            <p className="text-base font-bold leading-snug text-deep sm:text-lg">
              {t("subj.bannerTitle")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{t("subj.bannerHint")}</p>
          </div>
          <div
            aria-hidden="true"
            className="relative ml-3 flex h-16 w-24 shrink-0 items-center justify-center sm:h-20 sm:w-32"
          >
            <span className="absolute bottom-1 h-8 w-20 -rotate-6 rounded-lg border-b-4 border-sky-300 bg-white shadow-md sm:w-28" />
            <span className="absolute bottom-3 h-7 w-16 rotate-3 rounded-lg border-b-4 border-cyan-400 bg-sky-100 shadow-sm sm:w-24" />
            <GraduationCap className="absolute top-0 h-12 w-12 -rotate-6 text-deep drop-shadow-sm sm:h-14 sm:w-14" />
            <Sparkles className="absolute right-0 top-1 h-4 w-4 text-brand sm:h-5 sm:w-5" />
          </div>
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-20 -z-10 h-48 w-48 rounded-full bg-sky-200/50 blur-2xl"
          />
        </section>
      </div>

      {resources.isLoading ? (
        <Loading />
      ) : resources.error ? (
        <ErrorState error={resources.error} onRetry={() => void resources.refetch()} />
      ) : subjects.length === 0 ? (
        <Empty>{t("subj.empty")}</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => {
            const SubjectIcon = subjectIcons[subject.icon ?? ""] ?? BookOpen;
            const chapters = chaptersFor(catalog, subject.id, levelIdInProfile);
            const subjectTracks = catalog.tracks.filter(
              (item) =>
                item.level_id === levelIdInProfile &&
                catalog.trackSubjects.some(
                  (association) =>
                    association.track_id === item.id && association.subject_id === subject.id,
                ),
            );
            return (
              <Link
                key={subject.id}
                to="/subjects/$subjectId"
                params={{ subjectId: subject.id }}
                className="group relative flex min-h-40 flex-col justify-between rounded-2xl border border-sky-100 bg-card p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5"
              >
                <span className="flex min-w-0 items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-brand shadow-sm">
                    <SubjectIcon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      {subjectTracks.map((subjectTrack) => (
                        <span
                          key={subjectTrack.id}
                          className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-deep"
                        >
                          {subjectTrack.code}
                        </span>
                      ))}
                    </span>
                    <span className="block truncate text-base font-bold text-heading">
                      {name(subject)}
                    </span>
                  </span>
                </span>

                <span className="mt-5 grid grid-cols-3 gap-1.5">
                  <span className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg bg-sky-50 px-1.5 py-2 text-[10px] font-medium text-deep sm:text-xs">
                    <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {chapters.length} {t("subj.chapters").toLowerCase()}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg bg-sky-50 px-1.5 py-2 text-[10px] font-medium text-deep sm:text-xs">
                    <Play className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {resources.data?.courses[subject.id] ?? 0} {t("subj.courses").toLowerCase()}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg bg-sky-50 px-1.5 py-2 text-[10px] font-medium text-deep sm:text-xs">
                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {resources.data?.exams[subject.id] ?? 0} {t("subj.examsShort")}
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
