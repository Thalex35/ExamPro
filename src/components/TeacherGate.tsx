import type { ReactNode } from "react";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Empty } from "./States";

export function TeacherGate({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const { t } = useI18n();
  if (!me?.isTeacher && !me?.isAdmin) return <Empty>{t("teacher.onlyTeachers")}</Empty>;
  return <>{children}</>;
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const { t } = useI18n();
  if (!me?.isAdmin) return <Empty>{t("admin.onlyAdmins")}</Empty>;
  return <>{children}</>;
}
