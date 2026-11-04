import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/_authenticated/subjects.$subjectId";
import type { Catalog } from "@/lib/catalog";

const mocks = vi.hoisted(() => ({
  catalog: undefined as unknown,
  me: undefined as unknown,
  resources: { courses: [], exams: [] } as {
    courses: { id: string; chapter_id: string | null }[];
    exams: { id: string; chapter_id: string | null }[];
  },
  subjectId: "math",
  search: {} as { chapter?: string; resource?: "courses" | "quiz" | "exams" },
}));

vi.mock("@tanstack/react-router", async () => {
  const React = await import("react");
  return {
    createFileRoute: () => (options: Record<string, unknown>) => ({
      ...options,
      options,
      useParams: () => ({ subjectId: mocks.subjectId }),
      useSearch: () => mocks.search,
    }),
    Link: ({
      to,
      params,
      search,
      children,
      ...props
    }: {
      to: string;
      params?: { subjectId: string };
      search?: Record<string, string | undefined>;
      children: React.ReactNode;
    }) => {
      const path = params?.subjectId ? `/subjects/${params.subjectId}` : to;
      const query = Object.entries(search ?? {})
        .filter((entry): entry is [string, string] => !!entry[1])
        .map(([key, value]) => `${key}=${value}`)
        .join("&");
      return React.createElement(
        "a",
        { href: query ? `${path}?${query}` : path, ...props },
        children,
      );
    },
  };
});

vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQuery: ({ queryKey }: { queryKey: string[] }) =>
    queryKey[0] === "catalog"
      ? { data: mocks.catalog, isLoading: false, error: null, refetch: vi.fn() }
      : { data: mocks.resources, isLoading: false, error: null, refetch: vi.fn() },
}));

vi.mock("@/lib/session", () => ({
  useMe: () => ({ data: mocks.me }),
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        "subj.title": "Matières",
        "subj.chapters": "Chapitres",
        "subj.chapterDescription": "Explorez les ressources.",
        "subj.simpleDescription": "Retrouvez les ressources.",
        "subj.chapterNumber": "Chapitre",
        "subj.openChapter": "Explorer ce chapitre",
        "subj.availableResources": "Ressources disponibles",
        "subj.courses": "Cours",
        "subj.coursesDescription": "Leçons.",
        "subj.quiz": "Quiz",
        "subj.quizDescription": "Testez vos connaissances.",
        "subj.quizUnavailable": "Les quiz ne sont pas encore disponibles.",
        "subj.comingSoon": "Bientôt",
        "subj.exams": "Examens",
        "subj.examsCategory": "Examens",
        "subj.examsShort": "examens",
        "subj.examsDescription": "Entraînez-vous.",
        "subj.resourcesCount": "ressources",
        "subj.empty": "Aucune matière.",
      })[key] ?? key,
    name: (value: { name_fr: string }) => value.name_fr,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

function makeCatalog(): Catalog {
  return {
    levels: [{ id: "term", requires_track: false, name_fr: "Terminale" }],
    tracks: [],
    subjects: [
      { id: "math", slug: "mathematiques", name_fr: "Mathématiques" },
      { id: "english", slug: "anglais", name_fr: "Anglais" },
    ],
    levelSubjects: [
      { level_id: "term", subject_id: "math" },
      { level_id: "term", subject_id: "english" },
    ],
    trackSubjects: [],
    chapters: [{ id: "geometry", subject_id: "math", level_id: "term", name_fr: "Géométrie" }],
    topics: [],
  } as unknown as Catalog;
}

function renderSubject() {
  const SubjectPage = Route.options.component;
  if (!SubjectPage) throw new Error("Subject detail component is not configured");
  return render(<SubjectPage />);
}

describe("subject detail pages", () => {
  beforeEach(() => {
    mocks.catalog = makeCatalog();
    mocks.me = { profile: { level_id: "term", track_id: null } };
    mocks.resources = {
      courses: [
        { id: "course-1", chapter_id: "geometry" },
        { id: "course-2", chapter_id: "geometry" },
        { id: "course-3", chapter_id: null },
      ],
      exams: [
        { id: "exam-1", chapter_id: "geometry" },
        { id: "exam-2", chapter_id: null },
      ],
    };
    mocks.subjectId = "math";
    mocks.search = {};
  });

  it("shows three resource cards directly for a subject without chapters", () => {
    mocks.subjectId = "english";
    renderSubject();

    expect(screen.getByRole("heading", { name: "Anglais" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ressources disponibles" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chapitres" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cours/ })).toHaveAttribute(
      "href",
      "/courses?subject=english",
    );
    expect(screen.getByRole("link", { name: /Examens/ })).toHaveAttribute(
      "href",
      "/exams?subject=english",
    );
    expect(screen.getByRole("link", { name: /Quiz/ })).toBeInTheDocument();
  });

  it("shows configured chapter cards with actual course and exam counts", () => {
    renderSubject();

    expect(screen.getByRole("heading", { name: "Chapitres" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Géométrie/ })).toHaveAttribute(
      "href",
      "/subjects/math?chapter=geometry",
    );
    expect(screen.getByText("2 Cours")).toBeInTheDocument();
    expect(screen.getByText("1 examens")).toBeInTheDocument();
    expect(screen.getAllByText("Bientôt")).toHaveLength(1);
    expect(
      screen.queryByRole("heading", { name: "Ressources disponibles" }),
    ).not.toBeInTheDocument();
  });

  it("shows the three resource categories for a selected chapter", () => {
    mocks.search = { chapter: "geometry" };
    renderSubject();

    expect(screen.getByRole("heading", { name: "Géométrie" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cours/ })).toHaveAttribute(
      "href",
      "/courses?subject=math&chapter=geometry",
    );
    expect(screen.getByRole("link", { name: /Examens/ })).toHaveAttribute(
      "href",
      "/exams?subject=math&chapter=geometry",
    );
    expect(screen.getByRole("link", { name: /Quiz/ })).toHaveAttribute(
      "href",
      "/subjects/math?chapter=geometry&resource=quiz",
    );
  });

  it("does not imply quiz resources exist", () => {
    mocks.search = { chapter: "geometry", resource: "quiz" };
    renderSubject();

    expect(screen.getByText("Les quiz ne sont pas encore disponibles.")).toBeInTheDocument();
  });
});
