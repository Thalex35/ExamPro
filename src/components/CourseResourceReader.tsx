import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Download, ExternalLink, Save, Video } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getVideoEmbedUrl } from "@/lib/course-resources";
import { useI18n } from "@/lib/i18n";

type ResourceType = "document" | "video" | "external_link";

export function CourseResourceReader({
  courseId,
  courseTitle,
  resourceTitle,
  resourceDescription,
  resourceType,
  resourceUrl,
  download,
  durationMinutes,
  progress,
  completed,
  canTrackProgress,
  onSaveProgress,
  onComplete,
  onError,
}: {
  courseId: string;
  courseTitle: string;
  resourceTitle: string;
  resourceDescription?: string | null;
  resourceType: ResourceType;
  resourceUrl: string | null;
  download: () => Promise<void>;
  durationMinutes: number | null;
  progress: number;
  completed: boolean;
  canTrackProgress: boolean;
  onSaveProgress: (progress: number) => Promise<void>;
  onComplete: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const { t } = useI18n();
  const [percent, setPercent] = useState(progress);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const lastSavedPercent = useRef(progress);
  const savingRef = useRef(false);
  const completingRef = useRef(false);
  const pendingSave = useRef<Promise<void> | null>(null);
  const videoEmbedUrl = resourceType === "video" ? getVideoEmbedUrl(resourceUrl) : null;
  const isDirectVideo = !!resourceUrl && /\.(mp4|m4v|webm|ogv|ogg)(?:$|[?#])/i.test(resourceUrl);

  useEffect(() => {
    setPercent(progress);
    lastSavedPercent.current = progress;
  }, [progress]);

  async function persist(value: number) {
    if (savingRef.current || completingRef.current || value <= lastSavedPercent.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await onSaveProgress(Math.min(value, 99));
      lastSavedPercent.current = Math.min(value, 99);
    } catch (error) {
      onError(error);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function markComplete() {
    if (completed || completingRef.current) return;
    completingRef.current = true;
    setCompleting(true);
    try {
      await pendingSave.current;
      await onComplete();
      setPercent(100);
      lastSavedPercent.current = 100;
    } catch (error) {
      completingRef.current = false;
      onError(error);
    } finally {
      setCompleting(false);
    }
  }

  function handleVideoTimeUpdate(currentTime: number, duration: number) {
    if (!Number.isFinite(duration) || duration <= 0) return;
    const next = Math.min(99, Math.floor((currentTime / duration) * 100));
    setPercent((current) => Math.max(current, next));
    if (next - lastSavedPercent.current >= 2 && !pendingSave.current) {
      const request = persist(next);
      pendingSave.current = request;
      void request.then(() => {
        if (pendingSave.current === request) pendingSave.current = null;
      });
    }
  }

  async function handleDownload() {
    try {
      await download();
    } catch (error) {
      onError(error);
    }
  }

  return (
    <article className="mx-auto max-w-6xl pb-10">
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            to="/courses/$courseId"
            params={{ courseId }}
            className="inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("course.backToDetails")}
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            {durationMinutes && (
              <span className="flex items-center gap-1">
                <Clock3 className="h-4 w-4" />
                {durationMinutes} {t("content.minutes")}
              </span>
            )}
            {canTrackProgress && (
              <span className="hidden items-center gap-1 sm:flex" aria-live="polite">
                <Save className="h-4 w-4" />
                {saving ? t("course.savingProgress") : t("course.progressSaved")}
              </span>
            )}
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-6xl">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>{t("course.readingProgress")}</span>
            <span>{percent}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
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
      </div>

      <header className="py-6 sm:py-8">
        <p className="text-sm font-semibold text-deep">{courseTitle}</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-heading sm:text-4xl">
          {resourceTitle}
        </h1>
        {resourceDescription && (
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
            {resourceDescription}
          </p>
        )}
      </header>

      {resourceType === "document" && resourceUrl ? (
        <section className="card-surface overflow-hidden p-2 sm:p-3">
          <iframe
            src={resourceUrl}
            title={resourceTitle}
            className="h-[65vh] min-h-[480px] w-full rounded-lg bg-white sm:h-[75vh]"
          />
        </section>
      ) : resourceType === "video" && resourceUrl ? (
        <section className="card-surface overflow-hidden p-2 sm:p-3">
          {videoEmbedUrl ? (
            <div className="aspect-video overflow-hidden rounded-lg bg-black">
              <iframe
                src={videoEmbedUrl}
                title={resourceTitle}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : isDirectVideo ? (
            <video
              src={resourceUrl}
              title={resourceTitle}
              controls
              className="max-h-[75vh] w-full rounded-lg bg-black"
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                if (progress > 0 && progress < 100 && video.duration > 0) {
                  video.currentTime = (video.duration * progress) / 100;
                }
              }}
              onTimeUpdate={(event) => {
                if (canTrackProgress) {
                  handleVideoTimeUpdate(
                    event.currentTarget.currentTime,
                    event.currentTarget.duration,
                  );
                }
              }}
              onEnded={() => {
                if (canTrackProgress) void markComplete();
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-accent/50 px-5 py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Video className="h-8 w-8" />
              </span>
              <p className="max-w-lg text-muted-foreground">{resourceTitle}</p>
              <a
                href={resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("content.watchVideo")}
              </a>
            </div>
          )}
        </section>
      ) : resourceType === "external_link" && resourceUrl ? (
        <section className="card-surface flex flex-col items-start gap-4 p-6 sm:p-8">
          <p className="text-muted-foreground">{resourceTitle}</p>
          <a
            href={resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("content.openLink")}
          </a>
        </section>
      ) : null}

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        {canTrackProgress && (
          <p className="text-sm text-muted-foreground">
            {completed ? t("course.completed") : t("course.progressSaved")}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {resourceType === "document" && (
            <Button variant="outline" onClick={() => void handleDownload()}>
              <Download className="mr-2 h-4 w-4" />
              {t("content.download")}
            </Button>
          )}
          {canTrackProgress && (
            <Button onClick={() => void markComplete()} disabled={completed || completing}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {completed
                ? t("course.completed")
                : completing
                  ? t("common.loading")
                  : t("course.markComplete")}
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}
