import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { canAccessRolePath, type AppAreaRole } from "@/lib/route-access";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const user = authData.user;
    if (!user) throw redirect({ to: "/auth" });

    const [profileResult, roleResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("onboarded,geographical_department,is_active")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (roleResult.error) throw roleResult.error;
    if (profileResult.data && !profileResult.data.is_active) {
      throw redirect({ to: "/auth", search: { reason: "unauthorized" } });
    }

    const roles = (roleResult.data ?? [])
      .map((entry) => entry.role)
      .filter(
        (role): role is AppAreaRole => role === "admin" || role === "student" || role === "teacher",
      );
    if (!canAccessRolePath(location.pathname, roles)) {
      throw redirect({ to: "/auth", search: { reason: "unauthorized" } });
    }

    if (roles.includes("admin")) {
      if (location.pathname === "/onboarding") throw redirect({ to: "/admin" });
      return;
    }

    const isTeacher = roles.includes("teacher");
    const isStudent = roles.includes("student");
    const isOnboarded =
      !!profileResult.data?.onboarded &&
      (isTeacher || (isStudent && !!profileResult.data.geographical_department));
    if (!isOnboarded) {
      if (location.pathname !== "/onboarding") throw redirect({ to: "/onboarding" });
      return;
    }

    if (location.pathname === "/onboarding") {
      throw redirect({ to: isTeacher ? "/teacher" : "/dashboard" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { pathname } = useLocation();

  return (
    <AppShell onboardingOnly={pathname === "/onboarding"}>
      <Outlet />
    </AppShell>
  );
}
