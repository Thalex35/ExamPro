import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/_authenticated/subjects.index";
import type { Catalog } from "@/lib/catalog";

const mocks = vi.hoisted(() => ({
  catalog: undefined as unknown,
  me: undefined as unknown,
  resourceCounts: undefined as unknown,
}));

vi.mock("@tanstack/react-router", async () => {
  const React = await import("react");
  return {
    createFileRoute: () => (options: unknown) => options,
    Link: ({
      to,
      params,
      children,
      ...props
    }: {
      to: string;
      params?: { subjectId: string };
      children: React.ReactNode;
    }) =>
      React.createElement(
        "a",
        { href: params?.subjectId ? `/subjects/${params.subjectId}` : to, ...props },
        children,
      ),
  };
});

vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQuery: ({ queryKey }: { queryKey: string[] }) =>
    queryKey[0] === "catalog"
      ? { data: mocks.catalog, isLoading: false, error: null, refetch: vi.fn() }
      : { data: mocks.resourceCounts, isLoading: false, error: null, refetch: vi.fn() },
}));

vi.mock("@/lib/session", () => ({
  useMe: () => ({ data: mocks.me }),
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    name: (value: { name_fr: string }) => value.name_fr,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

function makeCatalog(): Catalog {
  return {
    levels: [
      { id: "9e", requires_track: false, name_fr: "9e Année" },
      { id: "term", requires_track: true, name_fr: "Terminale" },
    ],
    tracks: [
      { id: "smp", level_id: "term", code: "SMP" },
      { id: "svt", level_id: "term", code: "SVT" },
    ],
    subjects: [
      { id: "math", slug: "mathematiques", name_fr: "Mathématiques" },
      { id: "physics", slug: "physique", name_fr: "Physique" },
      { id: "biology", slug: "biologie", name_fr: "Biologie" },
      { id: "french", slug: "francais", name_fr: "Français" },
    ],
    levelSubjects: [
      { level_id: "term", subject_id: "math" },
      { level_id: "term", subject_id: "physics" },
      { level_id: "term", subject_id: "biology" },
      { level_id: "9e", subject_id: "french" },
    ],
    trackSubjects: [
      { track_id: "smp", subject_id: "math" },
      { track_id: "smp", subject_id: "physics" },
      { track_id: "svt", subject_id: "biology" },
    ],
    chapters: [
      { id: "math-chapter-1", subject_id: "math", level_id: "term" },
      { id: "math-chapter-2", subject_id: "math", level_id: "term" },
      { id: "french-chapter", subject_id: "french", level_id: "9e" },
    ],
    topics: [],
  } as unknown as Catalog;
}

function renderSubjects() {
  const SubjectPage = Route.component;
  return render(<SubjectPage />);
}

describe("subjects page", () => {
  beforeEach(() => {
    mocks.catalog = makeCatalog();
    mocks.resourceCounts = {
      courses: { math: 3, physics: 1 },
      exams: { math: 4, physics: 2 },
    };
  });

  it("uses only the authenticated Terminale track and shows real resource counts", () => {
    mocks.me = {
      profile: { level_id: "term", track_id: "smp" },
      isStudent: true,
    };
    renderSubjects();

    expect(screen.getByText("Mathématiques")).toBeInTheDocument();
    expect(screen.getByText("Physique")).toBeInTheDocument();
    expect(screen.queryByText("Biologie")).not.toBeInTheDocument();
    expect(screen.queryByText("Français")).not.toBeInTheDocument();
    expect(screen.getByText("3 subj.courses")).toBeInTheDocument();
    expect(screen.getByText("4 subj.examsShort")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mathématiques/ })).toHaveAttribute(
      "href",
      "/subjects/math",
    );
  });

  it("uses the registered 9e level without showing Terminale subjects or a level selector", () => {
    mocks.me = {
      profile: { level_id: "9e", track_id: null },
      isStudent: true,
    };
    mocks.resourceCounts = { courses: {}, exams: {} };
    renderSubjects();

    expect(screen.getByText("Français")).toBeInTheDocument();
    expect(screen.queryByText("Mathématiques")).not.toBeInTheDocument();
    expect(screen.queryByText("Biologie")).not.toBeInTheDocument();
    expect(screen.getByText("0 subj.courses")).toBeInTheDocument();
    expect(screen.getByText("0 subj.examsShort")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
