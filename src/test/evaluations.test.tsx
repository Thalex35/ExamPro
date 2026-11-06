import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/_authenticated/evaluations";
import type { Catalog } from "@/lib/catalog";

const mocks = vi.hoisted(() => ({
  catalog: undefined as unknown,
  me: undefined as unknown,
}));

vi.mock("@tanstack/react-router", async () => {
  const React = await import("react");
  return {
    createFileRoute: () => (options: Record<string, unknown>) => ({ ...options, options }),
    Link: ({
      to,
      params,
      search,
      children,
      ...props
    }: {
      to: string;
      params?: { subjectId: string };
      search?: { chapter?: string; resource?: string };
      children: React.ReactNode;
    }) => {
      const query = new URLSearchParams();
      if (search?.chapter) query.set("chapter", search.chapter);
      if (search?.resource) query.set("resource", search.resource);
      const href = `${to.replace("$subjectId", params?.subjectId ?? "")}${
        query.size ? `?${query.toString()}` : ""
      }`;
      return React.createElement("a", { href, ...props }, children);
    },
  };
});

vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQuery: () => ({ data: mocks.catalog, isLoading: false, error: null, refetch: vi.fn() }),
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

function makeCatalog(): Catalog {
  return {
    levels: [
      { id: "9e", requires_track: false, name_fr: "9ème année" },
      { id: "term", requires_track: true, name_fr: "Terminale" },
    ],
    tracks: [
      { id: "smp", level_id: "term", code: "SMP" },
      { id: "svt", level_id: "term", code: "SVT" },
    ],
    subjects: [
      { id: "math", slug: "mathematiques", name_fr: "Mathématiques", icon: "calculator" },
      { id: "physics", slug: "physique", name_fr: "Physique", icon: "atom" },
      { id: "biology", slug: "biologie", name_fr: "Biologie", icon: "dna" },
      { id: "french", slug: "francais", name_fr: "Français", icon: "languages" },
    ],
    levelSubjects: [
      { level_id: "9e", subject_id: "math" },
      { level_id: "9e", subject_id: "french" },
      { level_id: "term", subject_id: "math" },
      { level_id: "term", subject_id: "physics" },
      { level_id: "term", subject_id: "biology" },
    ],
    trackSubjects: [
      { track_id: "smp", subject_id: "math" },
      { track_id: "smp", subject_id: "physics" },
      { track_id: "svt", subject_id: "biology" },
    ],
    chapters: [{ id: "geometry", subject_id: "math", level_id: "term", name_fr: "Géométrie" }],
    topics: [],
  } as unknown as Catalog;
}

function renderEvaluations() {
  const EvaluationsPage = Route.options.component;
  if (!EvaluationsPage) throw new Error("Evaluations page component is not configured");
  return render(<EvaluationsPage />);
}

describe("evaluations page", () => {
  beforeEach(() => {
    mocks.catalog = makeCatalog();
  });

  it("recommends only subjects in the student's Terminale SMP track and opens scoped quizzes", () => {
    mocks.me = { profile: { level_id: "term", track_id: "smp" } };
    renderEvaluations();

    expect(screen.getByText("Mathématiques")).toBeInTheDocument();
    expect(screen.getByText("Physique")).toBeInTheDocument();
    expect(screen.queryByText("Biologie")).not.toBeInTheDocument();
    expect(screen.getAllByText("eval.recommended")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /eval.startQuiz/ })[0]).toHaveAttribute(
      "href",
      "/subjects/math?chapter=geometry&resource=quiz",
    );
    expect(screen.getByText("eval.quizDemoNotice")).toBeInTheDocument();
  });

  it("adapts Terminale recommendations to other tracks", () => {
    mocks.me = { profile: { level_id: "term", track_id: "svt" } };
    renderEvaluations();

    expect(screen.getByText("Biologie")).toBeInTheDocument();
    expect(screen.queryByText("Mathématiques")).not.toBeInTheDocument();
    expect(screen.getByText("eval.recommended")).toBeInTheDocument();
  });

  it("shows only 9e subjects without recommendation badges", () => {
    mocks.me = { profile: { level_id: "9e", track_id: null } };
    renderEvaluations();

    expect(screen.getByText("Mathématiques")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
    expect(screen.queryByText("Physique")).not.toBeInTheDocument();
    expect(screen.queryByText("eval.recommended")).not.toBeInTheDocument();
  });

  it("keeps simulations locked and teacher evaluations unavailable", () => {
    mocks.me = { profile: { level_id: "9e", track_id: null } };
    renderEvaluations();
    fireEvent.click(screen.getByRole("tab", { name: "eval.simulationCategory" }));

    expect(screen.getByText("eval.simulationDescription")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "eval.comingSoon" })).toBeDisabled();

    fireEvent.click(screen.getByRole("tab", { name: "eval.teacherCategory" }));
    expect(screen.getByText("eval.teacherDescription")).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "eval.unavailable" })).toBeDisabled();
  });
});
