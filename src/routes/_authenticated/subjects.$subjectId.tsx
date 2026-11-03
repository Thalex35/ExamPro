import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, chaptersFor, subjectsFor, topicsFor, trackFilter } from "@/lib/catalog";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Empty, ErrorState, Loading } from "@/components/States";
import { cn } from "@/lib/utils";
import { DemoBadge } from "@/components/DemoBadge";

export const Route = createFileRoute("/_authenticated/subjects/$subjectId")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { chapter?: string | undefined; topic?: string | undefined } => ({
    chapter: typeof s["chapter"] === "string" ? s["chapter"] : undefined,
    topic: typeof s["topic"] === "string" ? s["topic"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Matière — EXAMPRO" }] }),
  component: SubjectDetail,
});

function SubjectDetail() {
  const { subjectId } = Route.useParams();
  const { chapter, topic } = Route.useSearch();
  const { t, name } = useI18n();
  const { data: me } = useMe();
  const cat = useQuery(catalogQuery);
  const levelId = me?.profile?.level_id;
  const trackId = me?.profile?.track_id;

  const courses = useQuery({
    queryKey: ["subject-courses", subjectId, levelId, trackId, chapter, topic],
    enabled: !!levelId,
    queryFn: async () => {
      let q = supabase
        .from("courses")
        .select("id,title,summary,chapter_id,topic_id,published_at,is_demo")
        .eq("status", "published")
        .eq("subject_id", subjectId)
        .eq("level_id", levelId!)
        .or(trackFilter(trackId));
      if (topic) q = q.eq("topic_id", topic);
      else if (chapter) q = q.eq("chapter_id", chapter);
      const { data, error } = await q.order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (cat.isLoading) return <Loading />;
  if (cat.error || !cat.data) return <ErrorState error={cat.error} onRetry={() => cat.refetch()} />;
  const c = cat.data;
  const subject = c.subjects.find((s) => s.id === subjectId);
  const allowed = subjectsFor(c, levelId, trackId).some((s) => s.id === subjectId);
  if (!subject || !allowed) return <Empty>{t("subj.empty")}</Empty>;
  const chapters = chaptersFor(c, subjectId, levelId);
  const activeChapter = chapters.find((x) => x.id === chapter);
  const activeTopic = c.topics.find((x) => x.id === topic);

  return (
    <div>
      <nav
        className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
        aria-label="breadcrumb"
      >
        <Link to="/subjects" className="hover:text-foreground">
          {t("subj.title")}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          to="/subjects/$subjectId"
          params={{ subjectId }}
          search={{}}
          className="hover:text-foreground"
        >
          {name(subject)}
        </Link>
        {activeChapter && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span>{name(activeChapter)}</span>
          </>
        )}
        {activeTopic && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span>{name(activeTopic)}</span>
          </>
        )}
      </nav>
      <h1 className="mb-8 text-2xl font-bold sm:text-3xl">{name(subject)}</h1>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <aside>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("subj.chapters")}
          </h2>
          {chapters.length === 0 ? (
            <Empty>{t("subj.noChapters")}</Empty>
          ) : (
            <div className="card-surface divide-y overflow-hidden">
              <Link
                to="/subjects/$subjectId"
                params={{ subjectId }}
                search={{}}
                className={cn(
                  "block px-4 py-3 text-sm font-medium hover:bg-muted",
                  !chapter && "bg-accent text-accent-foreground",
                )}
              >
                {t("subj.allCourses")}
              </Link>
              {chapters.map((ch) => {
                const topics = topicsFor(c, ch.id);
                const open = ch.id === chapter;
                return (
                  <div key={ch.id}>
                    <Link
                      to="/subjects/$subjectId"
                      params={{ subjectId }}
                      search={{ chapter: ch.id }}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted",
                        open && !topic && "bg-accent text-accent-foreground",
                      )}
                    >
                      {name(ch)}
                      {!ch.verified && (
                        <span className="text-[10px] font-semibold uppercase text-warning">
                          {t("common.toVerify")}
                        </span>
                      )}
                    </Link>
                    {open && topics.length > 0 && (
                      <ul className="bg-muted/50 pb-2">
                        {topics.map((tp) => (
                          <li key={tp.id}>
                            <Link
                              to="/subjects/$subjectId"
                              params={{ subjectId }}
                              search={{ chapter: ch.id, topic: tp.id }}
                              className={cn(
                                "block py-2 pl-8 pr-4 text-sm text-muted-foreground hover:text-foreground",
                                topic === tp.id && "font-semibold text-deep",
                              )}
                            >
                              {name(tp)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </aside>
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("subj.courses")}
          </h2>
          {courses.isLoading ? (
            <Loading />
          ) : courses.error ? (
            <ErrorState error={courses.error} onRetry={() => courses.refetch()} />
          ) : !courses.data?.length ? (
            <Empty>{t("subj.noCoursesHere")}</Empty>
          ) : (
            <div className="grid gap-3">
              {courses.data.map((x) => {
                const ch = c.chapters.find((y) => y.id === x.chapter_id);
                const tp = c.topics.find((y) => y.id === x.topic_id);
                return (
                  <Link
                    key={x.id}
                    to="/courses/$courseId"
                    params={{ courseId: x.id }}
                    className="card-surface block p-5 hover:shadow-brand"
                  >
                    <p className="text-lg font-semibold text-heading">{x.title}</p>
                    {x.is_demo && <DemoBadge />}
                    {x.summary && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{x.summary}</p>
                    )}
                    <p className="mt-2 text-xs text-deep">
                      {[ch && name(ch), tp && name(tp)].filter(Boolean).join(" · ")}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
          <Link
            to="/exams"
            search={{ subject: subjectId }}
            className="mt-6 inline-block text-sm font-semibold text-deep hover:underline"
          >
            {t("subj.exams")} →
          </Link>
        </section>
      </div>
    </div>
  );
}
