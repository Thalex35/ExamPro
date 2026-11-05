import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoQuiz } from "@/components/DemoQuiz";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  invoke: vi.fn(),
  me: {
    user: { id: "student-1", email: "student@example.test" },
    profile: { first_name: "A", last_name: "Student", full_name: "A Student" },
  },
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
    useBlocker: vi.fn(),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, functions: { invoke: mocks.invoke } },
}));

vi.mock("@/lib/session", () => ({
  useMe: () => ({ data: mocks.me }),
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
        "quiz.progress": "Progression",
        "quiz.of": "sur",
        "quiz.question": "Question",
        "quiz.questionNavigation": "Navigateur des questions",
        "quiz.answered": "répondue",
        "quiz.unanswered": "sans réponse",
        "quiz.reviewBeforeSubmit": "Vérifier mes réponses",
        "quiz.summaryTitle": "Résumé avant l’envoi",
        "quiz.summaryDescription": "Vérifiez vos choix.",
        "quiz.allAnswered": "Toutes les questions ont une réponse.",
        "quiz.unansweredRemaining": "questions restent sans réponse.",
        "quiz.notAnswered": "Pas encore de réponse",
        "quiz.editAnswer": "Modifier",
        "quiz.backToQuestions": "Retour au quiz",
        "quiz.previous": "Précédent",
        "quiz.next": "Suivant",
        "quiz.exit": "Quitter",
        "quiz.exitConfirm": "Quitter ?",
        "quiz.reportProblem": "Signaler un problème",
        "quiz.reportTitle": "Signaler un problème",
        "quiz.reportDescription": "Votre signalement sera envoyé.",
        "quiz.reportDetails": "Décrivez le problème",
        "quiz.reportPlaceholder": "Expliquez le problème.",
        "quiz.sendReport": "Envoyer le signalement",
        "quiz.reportCategory": "Problème de quiz signalé",
        "quiz.reportSent": "Votre signalement a été envoyé.",
        "quiz.reportError": "Erreur d’envoi",
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
    window.localStorage.clear();
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
    mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it("requires answers to all ten questions and displays the server score and explanations", async () => {
    render(<DemoQuiz subjectId="subject-1" chapterId="chapter-1" title="Géométrie" />);

    for (let index = 0; index < mocks.questions.length; index += 1) {
      fireEvent.click(screen.getByLabelText(`Option ${index + 1} A`));
      if (index === 0) {
        expect(
          JSON.parse(
            window.localStorage.getItem("exampro.quiz-draft.v1:student-1:subject-1:chapter-1")!,
          ).answers["question-1"],
        ).toBe(0);
      }
      if (index < mocks.questions.length - 1) {
        fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
      }
    }

    fireEvent.click(screen.getAllByRole("button", { name: "Vérifier mes réponses" }).at(-1)!);
    expect(screen.getByText("Résumé avant l’envoi")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Envoyer mes réponses" });
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
    expect(
      window.localStorage.getItem("exampro.quiz-draft.v1:student-1:subject-1:chapter-1"),
    ).toBeNull();
  }, 15_000);

  it("renders the Haitian Creole question and choices for the selected language", () => {
    mocks.lang = "ht";
    render(<DemoQuiz subjectId="subject-1" title="Anglè" />);

    expect(screen.getAllByText("Kesyon 1").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Opsyon 1 A")).toBeInTheDocument();
  });

  it("restores a user-scoped draft and reports a question through the existing contact function", async () => {
    const key = "exampro.quiz-draft.v1:student-1:subject-1:chapter-1";
    window.localStorage.setItem(
      key,
      JSON.stringify({ answers: { "question-1": 2 }, currentQuestion: 0 }),
    );
    render(<DemoQuiz subjectId="subject-1" chapterId="chapter-1" title="Géométrie" />);

    expect(await screen.findByLabelText("Option 1 C")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Signaler un problème" }));
    fireEvent.change(screen.getByLabelText("Décrivez le problème"), {
      target: { value: "The question text is unclear." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le signalement" }));

    await waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledWith(
        "contact",
        expect.objectContaining({
          body: expect.objectContaining({
            email: "student@example.test",
            message: expect.stringContaining("Question 1: Question 1"),
          }),
        }),
      );
    });
  });
});
