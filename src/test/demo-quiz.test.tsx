import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoQuiz } from "@/components/DemoQuiz";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  lang: "fr" as "fr" | "ht",
  questions: Array.from({ length: 10 }, (_, index) => ({
    id: `question-${index + 1}`,
    question_fr: `Question ${index + 1}`,
    question_ht: `Kesyon ${index + 1}`,
    options_fr: ["A", "B", "C", "D"].map((letter) => `Option ${index + 1} ${letter}`),
    options_ht: ["A", "B", "C", "D"].map((letter) => `Opsyon ${index + 1} ${letter}`),
  })),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn().mockResolvedValue(undefined) }),
  useQuery: () => ({
    data: mocks.questions,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-router", async () => {
  const React = await import("react");
  return {
    Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) =>
      React.createElement("a", { href: to, ...props }, children),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    lang: mocks.lang,
    t: (key: string) =>
      ({
        "quiz.demoLabel": "Quiz de démonstration",
        "quiz.title": "Testez vos connaissances",
        "quiz.description": "Dix questions.",
        "quiz.questionsAnswered": "questions répondues",
        "quiz.submit": "Envoyer mes réponses",
        "quiz.resultTitle": "Résultat du quiz",
        "quiz.correctAnswers": "bonnes réponses",
        "quiz.yourAnswer": "Votre réponse",
        "quiz.correctAnswer": "Bonne réponse",
        "quiz.tryAgain": "Recommencer le quiz",
        "quiz.viewProgress": "Voir ma progression",
      })[key] ?? key,
    errMsg: () => "Erreur",
  }),
}));

describe("demonstration quiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lang = "fr";
    mocks.rpc.mockResolvedValue({
      data: {
        score: 70,
        correct_count: 7,
        total: 10,
        attempt_id: "attempt-1",
        results: mocks.questions.map((question, index) => ({
          ...question,
          selected_index: 0,
          correct_index: index < 7 ? 0 : 1,
          is_correct: index < 7,
          explanation_fr: `Explication ${index + 1}`,
          explanation_ht: `Esplikasyon ${index + 1}`,
        })),
      },
      error: null,
    });
  });

  it("requires answers to all ten questions and displays the server score and explanations", async () => {
    render(<DemoQuiz subjectId="subject-1" chapterId="chapter-1" title="Géométrie" />);

    expect(screen.getAllByRole("group")).toHaveLength(10);
    const submit = screen.getByRole("button", { name: "Envoyer mes réponses" });
    expect(submit).toBeDisabled();

    for (let index = 0; index < mocks.questions.length; index += 1) {
      fireEvent.click(screen.getByLabelText(`Option ${index + 1} A`));
    }

    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    expect(await screen.findByText("70%")).toBeInTheDocument();
    expect(screen.getByText("Explication 1")).toBeInTheDocument();
    expect(screen.getByText("Bonne réponse: Option 8 B")).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "submit_demo_quiz",
      expect.objectContaining({
        _subject_id: "subject-1",
        _chapter_id: "chapter-1",
        _answers: expect.arrayContaining([
          expect.objectContaining({ question_id: "question-1", selected_index: 0 }),
        ]),
      }),
    );
    expect(mocks.rpc.mock.calls[0]?.[1]._answers).toHaveLength(10);
  });

  it("renders the Haitian Creole question and choices for the selected language", () => {
    mocks.lang = "ht";
    render(<DemoQuiz subjectId="subject-1" title="Anglè" />);

    expect(screen.getByText("Kesyon 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Opsyon 1 A")).toBeInTheDocument();
  });
});
