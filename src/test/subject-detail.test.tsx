import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/_authenticated/subjects.$subjectId";
import type { Catalog } from "@/lib/catalog";

const mocks = vi.hoisted(() => ({
  catalog: undefined as unknown,
  me: undefined as unknown,
  resources: { courses: [], exams: [] } as {
    courses: {
      id: string;
      title: string;
      summary: string | null;
      resource_type: string;
      resource_formats?: string[] | null;
      is_demo: boolean;
      chapter_id: string | null;
    }[];
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
      const target =
        to === "/courses/$courseId"
          ? `/courses/${(params as { courseId?: string })?.courseId}`
          : path;
      return React.createElement(
        "a",
        { href: query ? `${target}?${query}` : target, ...props },
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

vi.mock("@/components/FavoriteButton", () => ({
  FavoriteButton: () => null,
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
        "subj.resourceNavigation": "Navigation des ressources",
        "subj.courses": "Cours",
        "subj.coursesDescription": "Leçons.",
        "subj.noCoursesHere": "Aucun cours publié ici pour l'instant.",
        "subj.quiz": "Quiz",
        "subj.quizDescription": "Testez vos connaissances.",
        "quiz.studentOnly": "Le quiz est réservé aux élèves.",
        "quiz.demoLabel": "Quiz démo",
        "subj.comingSoon": "Bientôt",
        "subj.exams": "Examens",
        "subj.examsCategory": "Examens",
        "subj.examsShort": "examens",
        "subj.examsDescription": "Entraînez-vous.",
        "subj.resourcesCount": "ressources",
        "subj.empty": "Aucune matière.",
        "course.count": "cours",
        "course.filter": "Filtrer les cours",
        "course.filterAll": "Tous les cours",
        "course.summaryFallback": "Consultez le contenu de ce cours.",
        "course.view": "Voir le cours",
        "content.textLesson": "Cours rédigé",
        "content.document": "Document PDF",
        "content.externalLink": "Lien externe",
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
      { id: "french", slug: "francais", name_fr: "Français" },
    ],
    levelSubjects: [
      { level_id: "term", subject_id: "math" },
      { level_id: "term", subject_id: "english" },
      { level_id: "term", subject_id: "french" },
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
        {
          id: "course-1",
          title: "Géométrie plane",
          summary: "Les propriétés des figures planes.",
          resource_type: "text",
          resource_formats: ["text", "document"],
          is_demo: false,
          chapter_id: "geometry",
        },
        {
          id: "course-2",
          title: "Triangles",
          summary: null,
          resource_type: "document",
          resource_formats: ["document"],
          is_demo: false,
          chapter_id: "geometry",
        },
        {
          id: "course-3",
          title: "Conversation",
          summary: "Pratique de la conversation.",
          resource_type: "external_link",
          resource_formats: ["external_link"],
          is_demo: false,
          chapter_id: null,
        },
      ],
      exams: [
        { id: "exam-1", chapter_id: "geometry" },
        { id: "exam-2", chapter_id: null },
      ],
    };
    mocks.subjectId = "math";
    mocks.search = {};
  });

  it("shows the course list and active resource tabs for a subject without chapters", () => {
    mocks.subjectId = "english";
    mocks.resources.courses = [mocks.resources.courses[2]!];
    renderSubject();

    expect(screen.getByRole("heading", { name: "Anglais" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nos cours d'anglais" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chapitres" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cours" })).toHaveAttribute(
      "href",
      "/subjects/english?resource=courses",
    );
    expect(screen.getByRole("link", { name: "Examens" })).toHaveAttribute(
      "href",
      "/exams?subject=english",
    );
    expect(screen.getByRole("link", { name: "Cours" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Conversation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voir le cours/ })).toHaveAttribute(
      "href",
      "/courses/course-3",
    );
  });

  it("uses the selected French subject name in its course list title", () => {
    mocks.subjectId = "french";
    mocks.resources.courses = [
      {
        id: "course-fr",
        title: "Grammaire française",
        summary: "Les règles essentielles de grammaire.",
        resource_type: "text",
        is_demo: false,
        chapter_id: null,
      },
    ];
    renderSubject();

    expect(screen.getByRole("heading", { name: "Nos cours de français" })).toBeInTheDocument();
    expect(screen.getByText("Grammaire française")).toBeInTheDocument();
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
    expect(screen.getAllByText("Quiz démo")).toHaveLength(1);
    expect(
      screen.queryByRole("heading", { name: "Ressources disponibles" }),
    ).not.toBeInTheDocument();
  });

  it("shows the same course list and resource tabs for a selected chapter", () => {
    mocks.search = { chapter: "geometry" };
    renderSubject();

    expect(screen.getByRole("heading", { name: "Géométrie" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nos cours de géométrie" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cours" })).toHaveAttribute(
      "href",
      "/subjects/math?chapter=geometry&resource=courses",
    );
    expect(screen.getByRole("link", { name: "Examens" })).toHaveAttribute(
      "href",
      "/exams?subject=math&chapter=geometry",
    );
    expect(screen.getByRole("link", { name: "Quiz" })).toHaveAttribute(
      "href",
      "/subjects/math?chapter=geometry&resource=quiz",
    );
    expect(
      screen
        .getAllByRole("link", { name: /Voir le cours/ })
        .map((link) => link.getAttribute("href")),
    ).toContain("/courses/course-1");
  });

  it("filters a chapter's courses by the resource type in the database", () => {
    mocks.search = { chapter: "geometry" };
    renderSubject();

    fireEvent.change(screen.getByRole("combobox", { name: "Filtrer les cours" }), {
      target: { value: "document" },
    });

    expect(screen.getByText("Triangles")).toBeInTheDocument();
    expect(screen.getByText("Géométrie plane")).toBeInTheDocument();
    expect(screen.queryByText("Conversation")).not.toBeInTheDocument();
  });

  it("keeps the demonstration quiz restricted to student accounts", () => {
    mocks.search = { chapter: "geometry", resource: "quiz" };
    renderSubject();

    expect(screen.getByText("Le quiz est réservé aux élèves.")).toBeInTheDocument();
  });
});
