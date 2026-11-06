import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownLesson } from "@/components/MarkdownLesson";
import { useI18n } from "@/lib/i18n";

export function CourseReader({
  title,
  body,
  durationMinutes,
  progress,
  onClose,
  onSaveProgress,
  onComplete,
  onError,
}: {
  title: string;
  body: string;
  durationMinutes: number | null;
  progress: number;
  onClose: () => void;
  onSaveProgress: (progress: number) => Promise<void>;
  onComplete: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const { t } = useI18n();
  const [percent, setPercent] = useState(progress);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(progress === 100);
  const [completing, setCompleting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedPercent = useRef(progress);
  const completedRef = useRef(progress === 100);
  const saveProgressRef = useRef(onSaveProgress);
  const onErrorRef = useRef(onError);
  completedRef.current = completed;
  saveProgressRef.current = onSaveProgress;
  onErrorRef.current = onError;

  useEffect(() => {
    setPercent(progress);
    setCompleted(progress === 100);
    requestAnimationFrame(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0 && progress > 0) window.scrollTo(0, (maxScroll * progress) / 100);
    });
  }, [progress]);

  useEffect(() => {
    const readPercent = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      return maxScroll > 0 ? Math.min(99, Math.round((window.scrollY / maxScroll) * 100)) : 0;
    };
    const persist = async (value: number) => {
      if (value === savedPercent.current || completedRef.current) return;
      setSaving(true);
      try {
        await saveProgressRef.current(value);
        savedPercent.current = value;
      } catch (error) {
        onErrorRef.current(error);
      } finally {
        setSaving(false);
      }
    };
    const update = () => {
      const current = readPercent();
      setPercent(current);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void persist(current), 1200);
    };
    const flush = () => void persist(readPercent());
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("pagehide", flush);
      if (timer.current) clearTimeout(timer.current);
      if (completedRef.current) return;
      void persist(readPercent());
    };
  }, [completed]);

  async function markComplete() {
    if (completed || completing) return;
    setCompleting(true);
    try {
      await onComplete();
      savedPercent.current = 100;
      completedRef.current = true;
      setPercent(100);
      setCompleted(true);
    } catch (error) {
      onError(error);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <article className="mx-auto max-w-4xl pb-12">
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("course.backToDetails")}
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            {durationMinutes && (
              <span className="flex items-center gap-1">
                <Clock3 className="h-4 w-4" />
                {durationMinutes} {t("content.minutes")}
              </span>
            )}
            <span className="hidden items-center gap-1 sm:flex" aria-live="polite">
              <Save className="h-4 w-4" />
              {saving ? t("course.savingProgress") : t("course.progressSaved")}
            </span>
          </div>
        </div>
        <div
          className="mx-auto mt-3 h-1.5 max-w-4xl overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={t("course.readingProgress")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <header className="mb-8 border-b border-border pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-deep">
          {t("course.reading")}
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-heading sm:text-4xl">{title}</h1>
      </header>
      {body.trim() ? (
        <MarkdownLesson content={body} />
      ) : (
        <div className="card-surface p-6 text-muted-foreground">{t("course.emptyContent")}</div>
      )}
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("course.backToDetails")}
        </Button>
        <Button
          onClick={() => void markComplete()}
          disabled={completed || completing || !body.trim()}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {completed
            ? t("course.completed")
            : completing
              ? t("common.loading")
              : t("course.markComplete")}
        </Button>
      </footer>
    </article>
  );
}
