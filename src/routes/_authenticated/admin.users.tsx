import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminGate } from "@/components/TeacherGate";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { NativeSelect } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

type UserRoleFilter = "all" | "student" | "teacher" | "admin";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Utilisateurs — EXAMPRO" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const { t, lang, errMsg } = useI18n();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("all");
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return (users.data ?? []).filter((user) => {
      const hasRole = roleFilter === "all" || user.roles.includes(roleFilter);
      return hasRole && `${user.full_name ?? ""} ${user.email}`.toLocaleLowerCase().includes(term);
    });
  }, [users.data, search, roleFilter]);

  async function toggleRole(userId: string, role: Role, enabled: boolean) {
    const { error } = await supabase.rpc("admin_set_role", {
      _user_id: userId,
      _role: role,
      _enabled: enabled,
    });
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function setActive(userId: string, active: boolean) {
    const { error } = await supabase.rpc("admin_set_user_active", {
      _user_id: userId,
      _active: active,
    });
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(t("common.saved"));
  }

  return (
    <AdminGate>
      <PageHeader title={t("admin.manageUsers")} />
      <div className="card-surface mb-5 grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_240px]">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("admin.searchUsers")}
          aria-label={t("admin.searchUsers")}
        />
        <NativeSelect
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as UserRoleFilter)}
          aria-label={t("admin.roles")}
        >
          <option value="all">{t("admin.allUsers")}</option>
          <option value="student">{t("admin.studentUsers")}</option>
          <option value="teacher">{t("admin.teacherUsers")}</option>
          <option value="admin">{t("admin.adminUsers")}</option>
        </NativeSelect>
      </div>
      {users.isLoading ? (
        <Loading />
      ) : users.error ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : !filtered.length ? (
        <Empty>{t("admin.noUsers")}</Empty>
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-3">{t("auth.fullName")}</th>
                <th className="p-3">{t("admin.email")}</th>
                <th className="p-3">{t("admin.roles")}</th>
                <th className="p-3">{t("admin.accountStatus")}</th>
                <th className="p-3">{t("admin.userDetails")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((user) => {
                const self = user.user_id === me?.user.id;
                const roleLabel = (role: Role) =>
                  role === "student"
                    ? t("admin.studentUsers")
                    : role === "teacher"
                      ? t("admin.teacherUsers")
                      : role === "admin"
                        ? t("admin.adminUsers")
                        : role;
                return (
                  <tr key={user.user_id} className="align-top">
                    <td className="p-3 font-medium text-heading">
                      {user.full_name || "—"}
                      {self ? " (vous)" : ""}
                    </td>
                    <td className="p-3">{user.email || "—"}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        {(["student", "teacher", "admin"] as Role[]).map((role) => (
                          <label key={role} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={user.roles.includes(role)}
                              disabled={self && role === "admin"}
                              onChange={(event) =>
                                void toggleRole(user.user_id, role, event.target.checked)
                              }
                            />
                            {roleLabel(role)}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={user.is_active ? "text-emerald-700" : "text-destructive"}>
                        {t(user.is_active ? "admin.accountActive" : "admin.accountInactive")}
                      </span>
                      {!self && (
                        <Button
                          size="sm"
                          variant={user.is_active ? "ghost" : "outline"}
                          className="mt-2 block"
                          onClick={() => void setActive(user.user_id, !user.is_active)}
                        >
                          {t(user.is_active ? "admin.disableAccount" : "admin.enableAccount")}
                        </Button>
                      )}
                    </td>
                    <td className="p-3">
                      <details>
                        <summary className="cursor-pointer text-deep">
                          {t("admin.userDetails")}
                        </summary>
                        <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
                          <div>
                            {t("admin.registeredAt")}:{" "}
                            {new Date(user.created_at).toLocaleDateString(
                              lang === "ht" ? "fr-HT" : "fr-FR",
                            )}
                          </div>
                          <div>
                            {t("admin.academicLevel")}:{" "}
                            {lang === "ht" ? (user.level_ht ?? "—") : (user.level_fr ?? "—")}
                          </div>
                          <div>
                            {t("admin.academicTrack")}: {user.track_code ?? "—"}
                          </div>
                          <div>
                            {t("admin.department")}: {user.geographical_department ?? "—"}
                          </div>
                          <div>
                            {t("admin.school")}: {user.school ?? "—"}
                          </div>
                          {user.teacher_verification_status && (
                            <div>
                              {t("admin.teacherVerification")}: {user.teacher_verification_status}
                            </div>
                          )}
                        </dl>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminGate>
  );
}
