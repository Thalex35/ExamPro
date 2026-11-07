import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FavoriteButton } from "@/components/FavoriteButton";

const mocks = vi.hoisted(() => ({
  courses: [] as string[],
  exams: [] as string[],
  inserts: [] as { table: string; values: Record<string, string> }[],
}));

vi.mock("@/lib/session", () => ({
  useMe: () => ({ data: { user: { id: "student-1" }, isStudent: true } }),
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    errMsg: () => "Favorite failed",
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const saved = table === "course_favorites" ? mocks.courses : mocks.exams;
      const idColumn = table === "course_favorites" ? "course_id" : "exam_id";
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: async () => ({
          data: saved.map((id) => ({ [idColumn]: id })),
          error: null,
        }),
        insert: async (values: Record<string, string>) => {
          mocks.inserts.push({ table, values });
          saved.push(values[idColumn]!);
          return { error: null };
        },
        delete: () => {
          const deleteBuilder = {
            eq: (column: string, value: string) => {
              if (column === idColumn) {
                const index = saved.indexOf(value);
                if (index >= 0) saved.splice(index, 1);
              }
              return deleteBuilder;
            },
          };
          return deleteBuilder;
        },
      };
      return builder;
    },
  },
}));

function renderFavorites() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FavoriteButton kind="course" resourceId="course-1" />
      <FavoriteButton kind="exam" resourceId="exam-1" />
    </QueryClientProvider>,
  );
}

describe("persistent favorites", () => {
  it("optimistically saves courses and exams to their separate Supabase tables", async () => {
    mocks.courses = [];
    mocks.exams = [];
    mocks.inserts = [];
    renderFavorites();

    const addCourse = await screen.findByRole("button", { name: "favorite.addCourse" });
    const addExam = await screen.findByRole("button", { name: "favorite.addExam" });
    fireEvent.click(addCourse);
    fireEvent.click(addExam);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "favorite.removeCourse" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: "favorite.removeExam" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    expect(mocks.inserts).toEqual([
      { table: "course_favorites", values: { student_id: "student-1", course_id: "course-1" } },
      { table: "exam_favorites", values: { student_id: "student-1", exam_id: "exam-1" } },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "favorite.removeCourse" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "favorite.addCourse" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
    expect(mocks.courses).toEqual([]);
  });
});
