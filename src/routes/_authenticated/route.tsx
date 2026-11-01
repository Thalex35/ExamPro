import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

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
        .select("onboarded,geographical_department")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (roleResult.error) throw roleResult.error;

    const roles = (roleResult.data ?? []).map((entry) => entry.role);
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
    if (
      isTeacher &&
      ["/dashboard", "/subjects", "/exams", "/admin"].some(
        (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
      )
    ) {
      throw redirect({ to: "/teacher" });
    }
    if (isStudent && location.pathname.startsWith("/teacher")) {
      throw redirect({ to: "/dashboard" });
    }
    if (isStudent && location.pathname.startsWith("/admin")) {
      throw redirect({ to: "/dashboard" });
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
