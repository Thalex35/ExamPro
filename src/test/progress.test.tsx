import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/_authenticated/progress";

const mocks = vi.hoisted(() => ({
  attempts: [
    {
      id: "attempt-1",
      subject_id: "math",
      chapter_id: "geometry",
      score: 80,
      correct_count: 8,
      total_questions: 10,
      created_at: "2026-11-05T12:00:00.000Z",
    },
    {
      id: "attempt-2",
      subject_id: "math",
      chapter_id: "geometry",
      score: 60,
      correct_count: 6,
      total_questions: 10,
      created_at: "2026-11-04T12:00:00.000Z",
    },
    {
      id: "attempt-3",
      subject_id: "english",
      chapter_id: null,
      score: 90,
      correct_count: 9,
      total_questions: 10,
      created_at: "2026-11-03T12:00:00.000Z",
    },
  ],
}));

vi.mock("@tanstack/react-router", async () => {
  const React = await import("react");
  return {
    createFileRoute: () => (options: Record<string, unknown>) => ({
      ...options,
      options,
    }),
    Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) =>
      React.createElement("a", { href: to, ...props }, children),
  };
});

vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === "catalog") {
      return {
        data: {
          levels: [{ id: "term", requires_track: false }],
          tracks: [],
          subjects: [
            { id: "math", name_fr: "Mathématiques", name_ht: "Matematik", icon: null },
            { id: "english", name_fr: "Anglais", name_ht: "Anglè", icon: null },
            { id: "arts", name_fr: "Arts", name_ht: "Atizay", icon: "palette" },
          ],
          levelSubjects: [
            { level_id: "term", subject_id: "math" },
            { level_id: "term", subject_id: "english" },
            { level_id: "term", subject_id: "arts" },
          ],
          trackSubjects: [],
          chapters: [{ id: "geometry", name_fr: "Géométrie", name_ht: "Jewometri" }],
          topics: [],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (queryKey[0] === "quiz-attempts") {
      return { data: mocks.attempts, isLoading: false, error: null, refetch: vi.fn() };
    }
    if (queryKey[0] === "completed-courses-count") {
      return {
        data: [{ course_id: "course-1" }, { course_id: "course-2" }],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (queryKey[0] === "favorites") {
      return {
        data: queryKey[1] === "course" ? ["course-1", "course-2"] : ["exam-1"],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (queryKey[0] === "quiz-attempt-review") {
      return {
        data: {
          score: 80,
          correct_count: 8,
          total: 10,
          results: Array.from({ length: 10 }, (_, index) => ({
            id: `question-${index}`,
            question_fr: `Question ${index + 1}`,
            question_ht: `Kesyon ${index + 1}`,
            options_fr: ["A", "B", "C", "D"],
            options_ht: ["A", "B", "C", "D"],
            selected_index: 0,
            correct_index: 1,
            is_correct: false,
            explanation_fr: `Explication ${index + 1}`,
            explanation_ht: `Esplikasyon ${index + 1}`,
          })),
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    return { data: [], isLoading: false, error: null, refetch: vi.fn() };
  },
}));

vi.mock("@/lib/session", () => ({
  useMe: () => ({
    data: {
      user: { id: "student-1" },
      isStudent: true,
      profile: { level_id: "term", track_id: null },
    },
  }),
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    lang: "fr",
    name: (value: { name_fr: string }) => value.name_fr,
    t: (key: string) =>
      ({
        "dash.performance": "Ma progression",
        "progress.subtitle": "Suivez vos performances.",
        "progress.statistics": "Statistiques",
        "progress.averageScore": "Score moyen",
        "progress.completedQuizzes": "Quiz complétés",
        "progress.completedCourses": "Cours terminés",
        "progress.favorites": "Favoris",
        "progress.bySubject": "Vos performances par matière",
        "progress.viewSubjectDetails": "Voir le détail",
        "progress.noScoreYet": "—",
        "progress.encouragementTitle": "Continuez comme ça !",
        "progress.encouragementBody": "Vous progressez bien.",
        "progress.viewQuizzes": "Voir les quiz",
        "progress.recentResults": "Derniers résultats",
        "progress.quizType": "Quiz",
        "progress.passed": "Réussi",
        "progress.needsReview": "À améliorer",
        "progress.personalizedAdvice": "Conseils personnalisés",
        "progress.adviceNoAttempts": "Commencez un quiz.",
        "progress.adviceLowScore": "Révisez {subject}.",
        "progress.adviceKeepGoing": "Continuez.",
        "progress.detailedHistory": "Historique détaillé",
        "progress.detailedHistoryHint": "Réponses et explications.",
        "progress.viewAnswers": "Voir les réponses",
        "progress.viewAllAnswers": "Voir toutes vos réponses",
        "progress.hideAnswers": "Masquer les réponses",
        "quiz.noAttempts": "Aucun quiz terminé.",
        "quiz.historyUnavailable": "Historique indisponible.",
        "quiz.yourAnswer": "Votre réponse",
        "quiz.correctAnswer": "Bonne réponse",
      })[key] ?? key,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

describe("student progress", () => {
  it("calculates real overall and per-subject averages and loads saved answer reviews", () => {
    const ProgressPage = Route.options.component;
    if (!ProgressPage) throw new Error("Progress route component is not configured");
    render(<ProgressPage />);

    expect(screen.getByText("Quiz complétés")).toBeInTheDocument();
    expect(screen.getAllByText("3")).toHaveLength(2);
    expect(screen.getByText("77%")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("Cours terminés").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Favoris").parentElement).toHaveTextContent("3");
    expect(screen.getAllByText("Mathématiques").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Anglais").length).toBeGreaterThan(0);
    const artsProgress = screen.getByRole("progressbar", { name: "Arts" });
    expect(artsProgress).toHaveAttribute("aria-valuenow", "0");
    const artsRow = artsProgress.parentElement;
    expect(artsRow).toHaveTextContent("—");
    expect(artsRow).not.toHaveTextContent("0%");
    expect(screen.getAllByText("Réussi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("À améliorer").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Voir toutes vos réponses" })[0]!);
    expect(screen.getByText("1. Question 1")).toBeInTheDocument();
    expect(screen.getByText("Explication 1")).toBeInTheDocument();
  });
});
