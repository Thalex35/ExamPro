import type { ReactNode } from "react";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Empty } from "./States";

export function TeacherGate({
  children,
  requireVerified = false,
}: {
  children: ReactNode;
  requireVerified?: boolean;
}) {
  const { data: me } = useMe();
  const { t } = useI18n();
  if (!me?.isTeacher && !me?.isAdmin) return <Empty>{t("teacher.onlyTeachers")}</Empty>;
  if (requireVerified && !me.isAdmin && me.profile?.teacher_verification_status !== "approved") {
    return (
      <Empty>
        {me.profile?.teacher_verification_status === "rejected"
          ? me.profile.teacher_verification_note || t("teacher.verificationRejected")
          : t("teacher.verificationPending")}
      </Empty>
    );
  }
  return <>{children}</>;
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const { t } = useI18n();
  if (!me?.isAdmin) return <Empty>{t("admin.onlyAdmins")}</Empty>;
  return <>{children}</>;
}
