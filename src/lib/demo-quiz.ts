export type DemoQuestion = {
  id: string;
  question_fr: string;
  question_ht: string;
  options_fr: string[];
  options_ht: string[];
};

export type DemoResultItem = DemoQuestion & {
  selected_index: number;
  correct_index: number;
  is_correct: boolean;
  explanation_fr: string;
  explanation_ht: string;
};

export type DemoResult = {
  score: number;
  correct_count: number;
  total: number;
  results: DemoResultItem[];
  attempt_id?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isQuestion(value: unknown): value is DemoQuestion {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.question_fr === "string" &&
    typeof value.question_ht === "string" &&
    Array.isArray(value.options_fr) &&
    value.options_fr.length === 4 &&
    value.options_fr.every((option) => typeof option === "string") &&
    Array.isArray(value.options_ht) &&
    value.options_ht.length === 4 &&
    value.options_ht.every((option) => typeof option === "string")
  );
}

function isResultItem(value: unknown): value is DemoResultItem {
  return (
    isQuestion(value) &&
    isRecord(value) &&
    typeof value.selected_index === "number" &&
    typeof value.correct_index === "number" &&
    typeof value.is_correct === "boolean" &&
    typeof value.explanation_fr === "string" &&
    typeof value.explanation_ht === "string"
  );
}

export function parseDemoQuizQuestions(value: unknown): DemoQuestion[] {
  if (
    !isRecord(value) ||
    !Array.isArray(value.questions) ||
    value.questions.length !== 10 ||
    !value.questions.every(isQuestion)
  ) {
    throw new Error("INVALID_DEMO_QUIZ");
  }
  return value.questions;
}

export function parseDemoQuizResult(value: unknown): DemoResult {
  if (
    !isRecord(value) ||
    typeof value.score !== "number" ||
    typeof value.correct_count !== "number" ||
    typeof value.total !== "number" ||
    !Array.isArray(value.results) ||
    !value.results.every(isResultItem) ||
    (value.attempt_id !== undefined && typeof value.attempt_id !== "string")
  ) {
    throw new Error("INVALID_DEMO_QUIZ_RESULT");
  }
  return {
    score: value.score,
    correct_count: value.correct_count,
    total: value.total,
    results: value.results,
    ...(typeof value.attempt_id === "string" ? { attempt_id: value.attempt_id } : {}),
  };
}
