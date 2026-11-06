import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, Loading, PageHeader } from "@/components/States";
import { useMe } from "@/lib/session";
import { useI18n, type TKey } from "@/lib/i18n";
import { catalogQuery } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type Category = Notification["category"];
type Audience = "students" | "teachers" | "all";

const categoryKeys: Record<Category, TKey> = {
  course: "notify.category.course",
  exam: "notify.category.exam",
  chapter_resource: "notify.category.chapter_resource",
  quiz: "notify.category.quiz",
  quiz_result: "notify.category.quiz_result",
  announcement: "notify.category.announcement",
  teacher_verification: "notify.category.teacher_verification",
  moderation: "notify.category.moderation",
  admin_review: "notify.category.admin_review",
};

function useNotificationData(pageSize: number, page = 0, realtime = true) {
  const { data: me } = useMe();
  const { t, lang, errMsg } = useI18n();
  const queryClient = useQueryClient();
  const userId = me?.user.id;
  const notifications = useQuery({
    queryKey: ["notifications", userId, pageSize, page],
    enabled: !!userId,
    queryFn: async () => {
      const start = page * pageSize;
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .range(start, start + pageSize - 1);
      if (error) throw error;
      return data;
    },
  });
  const unread = useQuery({
    queryKey: ["notification-unread", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!userId || !realtime) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
          void queryClient.invalidateQueries({ queryKey: ["notification-unread", userId] });
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          toast.error(t("notify.realtimeError"));
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, realtime, t, userId]);

  async function markRead(id: string) {
    if (!userId) return false;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("recipient_id", userId);
    if (error) {
      toast.error(errMsg(error));
      return false;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
      queryClient.invalidateQueries({ queryKey: ["notification-unread", userId] }),
    ]);
    return true;
  }

  async function markAllRead() {
    if (!userId || !unread.data) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
      queryClient.invalidateQueries({ queryKey: ["notification-unread", userId] }),
    ]);
    toast.success(t("notify.markedAllRead"));
  }

  return { notifications, unread, markRead, markAllRead, lang, t, me };
}

export function NotificationCenter() {
  const { notifications, unread, markRead, markAllRead, lang, t } = useNotificationData(8);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={t("dash.notifications")}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors duration-[var(--motion-fast-value)] hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {!!unread.data && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1 text-[10px] font-bold leading-5 text-destructive-foreground">
            {unread.data > 99 ? "99+" : unread.data}
          </span>
        )}
      </button>
      {open && (
        <section
          aria-label={t("notify.title")}
          className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-card shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <h2 className="font-semibold text-heading">{t("notify.title")}</h2>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={!unread.data}
              className="text-xs font-medium text-deep hover:underline disabled:opacity-50"
            >
              {t("notify.markAll")}
            </button>
          </div>
          <NotificationItems
            items={notifications.data ?? []}
            loading={notifications.isLoading}
            error={notifications.error}
            onRetry={() => void notifications.refetch()}
            onMarkRead={markRead}
            lang={lang}
            t={t}
          />
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t p-3 text-center text-sm font-semibold text-deep hover:bg-muted/50"
          >
            {t("notify.viewAll")}
          </Link>
        </section>
      )}
    </div>
  );
}

export function NotificationHistory() {
  const [page, setPage] = useState(0);
  const state = useNotificationData(25, page, false);
  const { lang, t, me } = state;
  if (!state.me || state.notifications.isLoading) return <Loading />;
  if (state.notifications.error || !state.notifications.data) {
    return (
      <ErrorState
        error={state.notifications.error}
        onRetry={() => void state.notifications.refetch()}
      />
    );
  }
  const notifications = state.notifications.data;
  return (
    <div className="space-y-6">
      <PageHeader title={t("notify.title")} />
      {me?.isAdmin && <AdminAnnouncementForm />}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={!state.unread.data}
          onClick={() => void state.markAllRead()}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          {t("notify.markAll")}
        </Button>
      </div>
      <NotificationItems
        items={notifications}
        loading={false}
        error={null}
        onRetry={() => void state.notifications.refetch()}
        onMarkRead={state.markRead}
        lang={lang}
        t={t}
      />
      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={page === 0}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("common.back")}
        </Button>
        <Button
          variant="outline"
          disabled={notifications.length < 25}
          onClick={() => setPage((current) => current + 1)}
        >
          {t("common.next")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function NotificationItems({
  items,
  loading,
  error,
  onRetry,
  onMarkRead,
  lang,
  t,
}: {
  items: Notification[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onMarkRead: (id: string) => Promise<boolean>;
  lang: "fr" | "ht";
  t: (key: TKey) => string;
}) {
  if (loading)
    return (
      <div className="p-4">
        <Loading />
      </div>
    );
  if (error)
    return (
      <div className="p-4">
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  if (items.length === 0)
    return <p className="p-5 text-sm text-muted-foreground">{t("notify.empty")}</p>;
  return (
    <ul className="max-h-[min(65vh,30rem)] divide-y overflow-y-auto">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={item.href}
            onClick={async (event) => {
              if (!item.read_at) {
                event.preventDefault();
                if (await onMarkRead(item.id)) window.location.assign(item.href);
              }
            }}
            className={`block p-4 transition-colors hover:bg-muted/50 ${item.read_at ? "" : "bg-accent/50"}`}
          >
            <div className="flex items-start gap-3">
              <span
                aria-label={item.read_at ? t("notify.read") : t("notify.unread")}
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at ? "bg-transparent" : "bg-brand"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-deep">
                    {t(categoryKeys[item.category])}
                  </span>
                  <time className="text-[11px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleString(lang === "ht" ? "fr-HT" : "fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
                <p className="mt-1 font-semibold text-heading">
                  {lang === "ht" ? item.title_ht : item.title_fr}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {lang === "ht" ? item.body_ht : item.body_fr}
                </p>
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

function AdminAnnouncementForm() {
  const { t, name, errMsg } = useI18n();
  const queryClient = useQueryClient();
  const catalog = useQuery(catalogQuery);
  const [audience, setAudience] = useState<Audience>("students");
  const [levelId, setLevelId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [titleHt, setTitleHt] = useState("");
  const [bodyFr, setBodyFr] = useState("");
  const [bodyHt, setBodyHt] = useState("");
  const [busy, setBusy] = useState(false);
  const tracks = (catalog.data?.tracks ?? []).filter(
    (track) => !levelId || track.level_id === levelId,
  );

  if (catalog.isLoading) return <Loading />;
  if (catalog.error) return <ErrorState error={catalog.error} />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_send_announcement", {
      _title_fr: titleFr.trim(),
      _title_ht: titleHt.trim(),
      _body_fr: bodyFr.trim(),
      _body_ht: bodyHt.trim(),
      _audience: audience,
      _level_id: audience === "students" ? levelId || null : null,
      _track_id: audience === "students" ? trackId || null : null,
    });
    setBusy(false);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success(t("notify.announcementSent").replace("{count}", String(data)));
    setTitleFr("");
    setTitleHt("");
    setBodyFr("");
    setBodyHt("");
  }

  return (
    <section className="card-surface p-5">
      <h2 className="text-lg font-bold text-heading">{t("notify.announcementTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("notify.announcementHelp")}</p>
      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label={t("notify.titleFr")} htmlFor="announcement-title-fr">
          <Input
            id="announcement-title-fr"
            required
            maxLength={120}
            value={titleFr}
            onChange={(e) => setTitleFr(e.target.value)}
          />
        </Field>
        <Field label={t("notify.titleHt")} htmlFor="announcement-title-ht">
          <Input
            id="announcement-title-ht"
            required
            maxLength={120}
            value={titleHt}
            onChange={(e) => setTitleHt(e.target.value)}
          />
        </Field>
        <Field label={t("notify.bodyFr")} htmlFor="announcement-body-fr">
          <Textarea
            id="announcement-body-fr"
            required
            maxLength={1000}
            rows={3}
            value={bodyFr}
            onChange={(e) => setBodyFr(e.target.value)}
          />
        </Field>
        <Field label={t("notify.bodyHt")} htmlFor="announcement-body-ht">
          <Textarea
            id="announcement-body-ht"
            required
            maxLength={1000}
            rows={3}
            value={bodyHt}
            onChange={(e) => setBodyHt(e.target.value)}
          />
        </Field>
        <Field label={t("notify.audience")} htmlFor="announcement-audience">
          <select
            id="announcement-audience"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={audience}
            onChange={(event) => {
              const next = event.target.value as Audience;
              setAudience(next);
              if (next !== "students") {
                setLevelId("");
                setTrackId("");
              }
            }}
          >
            <option value="students">{t("notify.students")}</option>
            <option value="teachers">{t("notify.teachers")}</option>
            <option value="all">{t("notify.everyone")}</option>
          </select>
        </Field>
        {audience === "students" && (
          <>
            <Field label={t("notify.levelOptional")} htmlFor="announcement-level">
              <select
                id="announcement-level"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={levelId}
                onChange={(event) => {
                  setLevelId(event.target.value);
                  setTrackId("");
                }}
              >
                <option value="">{t("notify.levelOptional")}</option>
                {(catalog.data?.levels ?? []).map((level) => (
                  <option key={level.id} value={level.id}>
                    {name(level)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("notify.trackOptional")} htmlFor="announcement-track">
              <select
                id="announcement-track"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={trackId}
                onChange={(event) => setTrackId(event.target.value)}
                disabled={!levelId}
              >
                <option value="">{t("notify.trackOptional")}</option>
                {tracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.code}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {catalog.error && <ErrorState error={catalog.error} />}
        <div className="sm:col-span-2 sm:justify-self-end">
          <Button type="submit" disabled={busy || catalog.isLoading}>
            {t("notify.sendAnnouncement")}
          </Button>
        </div>
      </form>
    </section>
  );
}
