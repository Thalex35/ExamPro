import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/AppShell";

const mocks = vi.hoisted(() => ({
  me: undefined as unknown,
  navigate: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@tanstack/react-router", async () => {
  const React = await import("react");
  return {
    Link: ({
      to,
      children,
      activeOptions: _activeOptions,
      activeProps: _activeProps,
      ...props
    }: {
      to: string;
      children: React.ReactNode;
      activeOptions?: unknown;
      activeProps?: unknown;
    }) => React.createElement("a", { href: to, ...props }, children),
    useLocation: () => ({ pathname: "/dashboard" }),
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("@/lib/session", () => ({
  useMe: () => ({ data: mocks.me, isLoading: false }),
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    errMsg: () => "Sign out failed",
    name: (value: string) => value,
  }),
}));

vi.mock("@/components/LanguageSwitch", () => ({
  LanguageSwitch: () => <div>Language</div>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut: mocks.signOut } },
}));

function renderShell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AppShell>
        <div>Dashboard content</div>
      </AppShell>
    </QueryClientProvider>,
  );
}

function getNavigationText() {
  return document.querySelector("nav")?.textContent ?? "";
}

function createMe(role: "student" | "teacher" | "admin") {
  return {
    user: { email: `${role}@exampro.test` },
    profile: {
      first_name: "Dany",
      last_name: "Beats",
      full_name: "Dany Beats",
      onboarded: true,
      level_id: null,
      track_id: null,
    },
    isStudent: role === "student",
    isTeacher: role === "teacher",
    isAdmin: role === "admin",
  };
}

describe("shared role-aware sidebar", () => {
  beforeEach(() => {
    mocks.me = undefined;
    mocks.navigate.mockReset();
    mocks.signOut.mockReset().mockResolvedValue({ error: null });
  });

  it("shows student navigation without teacher or administrator actions", () => {
    mocks.me = createMe("student");
    renderShell();
    const navigationText = getNavigationText();

    expect(navigationText).toContain("nav.subjects");
    expect(navigationText).toContain("course.all");
    expect(navigationText).toContain("dash.examArchive");
    expect(navigationText).toContain("dash.comingSoon");
    expect(navigationText).not.toContain("dash.help");
    expect(navigationText).not.toContain("nav.teacherExams");
    expect(navigationText).not.toContain("nav.adminUsers");
    expect(screen.queryByText("Language")).not.toBeInTheDocument();
  });

  it("shows teacher navigation without student or administrator actions", () => {
    mocks.me = createMe("teacher");
    renderShell();
    const navigationText = getNavigationText();

    expect(navigationText).toContain("nav.teacherExams");
    expect(navigationText).toContain("nav.teacherCourses");
    expect(navigationText).not.toContain("dash.examArchive");
    expect(navigationText).not.toContain("nav.adminUsers");
    expect(navigationText).not.toContain("dash.comingSoon");
  });

  it("shows administrator navigation without student or teacher actions", () => {
    mocks.me = createMe("admin");
    renderShell();
    const navigationText = getNavigationText();

    expect(navigationText).toContain("nav.adminUsers");
    expect(navigationText).toContain("nav.adminExams");
    expect(navigationText).not.toContain("dash.examArchive");
    expect(navigationText).not.toContain("nav.teacherExams");
  });

  it("places profile access and sign-out inside the bottom profile menu", async () => {
    mocks.me = createMe("student");
    renderShell();

    expect(screen.getByText("Dany Beats")).toBeInTheDocument();
    expect(screen.queryByText("nav.logout")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "Dany Beats" }), {
      key: "Enter",
    });

    const profileItem = await screen.findByRole("menuitem", { name: "profile.title" });
    const logoutItem = screen.getByRole("menuitem", { name: "nav.logout" });
    expect(profileItem).toHaveAttribute("href", "/profile");

    fireEvent.click(logoutItem);
    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledOnce();
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/auth", replace: true });
    });
  });
});
