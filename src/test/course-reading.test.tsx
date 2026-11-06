import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CourseReader } from "@/components/CourseReader";
import { MarkdownLesson } from "@/components/MarkdownLesson";

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe("written course reading", () => {
  it("renders headings, formatted text, lists, and formulas as safe structured content", () => {
    const { container } = render(
      <MarkdownLesson
        content={
          "## Leçon\n\nUn **texte important** et *une idée*.\n\n- Première étape\n- Deuxième étape\n\n$$x^2 + y^2 = z^2$$\n\n<script>alert(1)</script>\n\n[site dangereux](javascript:alert(1))"
        }
      />,
    );

    expect(screen.getByRole("heading", { name: "Leçon" })).toBeInTheDocument();
    expect(screen.getByText("texte important").tagName).toBe("STRONG");
    expect(screen.getByRole("list").children).toHaveLength(2);
    expect(container.querySelector(".katex-display .katex")).toBeInTheDocument();
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "site dangereux" })).not.toBeInTheDocument();
  });

  it("does not mark a course complete until the student requests it", async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <CourseReader
        title="Les fractions"
        body="## Introduction\n\nUn cours lisible."
        durationMinutes={20}
        progress={0}
        onClose={vi.fn()}
        onSaveProgress={vi.fn().mockResolvedValue(undefined)}
        onComplete={onComplete}
        onError={vi.fn()}
      />,
    );

    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "course.markComplete" }));
    expect(onComplete).toHaveBeenCalledOnce();
    rerender(
      <CourseReader
        title="Les fractions"
        body="## Introduction\n\nUn cours lisible."
        durationMinutes={20}
        progress={100}
        onClose={vi.fn()}
        onSaveProgress={vi.fn().mockResolvedValue(undefined)}
        onComplete={onComplete}
        onError={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "course.completed" })).toBeDisabled(),
    );
  });

  it("saves reading progress without marking the course complete", async () => {
    vi.useFakeTimers();
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 500 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 200 });
    const onSaveProgress = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn().mockResolvedValue(undefined);

    render(
      <CourseReader
        title="Les fractions"
        body="## Introduction\n\nUn cours lisible."
        durationMinutes={20}
        progress={0}
        onClose={vi.fn()}
        onSaveProgress={onSaveProgress}
        onComplete={onComplete}
        onError={vi.fn()}
      />,
    );
    fireEvent.scroll(window);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });

    expect(onSaveProgress).toHaveBeenCalledWith(40);
    expect(onComplete).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
