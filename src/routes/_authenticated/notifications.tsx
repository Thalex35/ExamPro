import { createFileRoute } from "@tanstack/react-router";
import { NotificationHistory } from "@/components/NotificationCenter";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — EXAMPRO" }] }),
  component: NotificationHistory,
});
