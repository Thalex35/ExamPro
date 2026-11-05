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
          subjects: [
            { id: "math", name_fr: "Mathématiques", name_ht: "Matematik" },
            { id: "english", name_fr: "Anglais", name_ht: "Anglè" },
          ],
          chapters: [{ id: "geometry", name_fr: "Géométrie", name_ht: "Jewometri" }],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (queryKey[0] === "quiz-attempts") {
      return { data: mocks.attempts, isLoading: false, error: null, refetch: vi.fn() };
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
        "demo.progressDescription": "Consultez vos résultats.",
        "quiz.performanceTitle": "Mes résultats aux quiz",
        "quiz.performanceDescription": "Vos résultats réels.",
        "quiz.attemptCount": "Quiz terminés",
        "quiz.averageScore": "Score moyen",
        "quiz.bestScore": "Meilleur score",
        "quiz.unknownSubject": "Matière indisponible",
        "quiz.retake": "Refaire le quiz",
        "quiz.reviewAnswers": "Voir les réponses",
        "quiz.historyUnavailable": "Historique indisponible.",
        "quiz.yourAnswer": "Votre réponse",
        "quiz.correctAnswer": "Bonne réponse",
        "demo.recentActivity": "Activité récente",
        "demo.progressEmpty": "Aucune activité.",
      })[key] ?? key,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

describe("student quiz performance", () => {
  it("summarizes scores per subject and chapter and loads saved answer reviews on demand", () => {
    const ProgressPage = Route.options.component;
    if (!ProgressPage) throw new Error("Progress route component is not configured");
    render(<ProgressPage />);

    expect(screen.getByText("Quiz terminés")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("77%")).toBeInTheDocument();
    expect(screen.getAllByText("90%")).toHaveLength(2);
    expect(screen.getByText("Mathématiques · Géométrie")).toBeInTheDocument();
    expect(screen.getByText("Anglais")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Voir les réponses")[0]!);
    expect(screen.getByText("1. Question 1")).toBeInTheDocument();
    expect(screen.getByText("Explication 1")).toBeInTheDocument();
  });
});
