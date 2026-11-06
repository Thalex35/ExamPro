import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CourseResourceReader } from "@/components/CourseResourceReader";
import { getVideoEmbedUrl } from "@/lib/course-resources";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        "course.backToDetails": "Back to course",
        "course.readingProgress": "Course progress",
        "course.progressSaved": "Progress saved",
        "course.savingProgress": "Saving",
        "course.completed": "Course completed",
        "course.markComplete": "Mark complete",
        "content.minutes": "minutes",
        "content.download": "Download PDF",
        "content.watchVideo": "Watch video",
        "content.openLink": "Open link",
        "common.loading": "Loading",
      })[key] ?? key,
  }),
}));

function renderReader(overrides: Partial<React.ComponentProps<typeof CourseResourceReader>> = {}) {
  const props: React.ComponentProps<typeof CourseResourceReader> = {
    courseId: "course-1",
    courseTitle: "Biologie cellulaire",
    resourceTitle: "Cellules.pdf",
    resourceType: "document",
    resourceUrl: "https://example.test/cellules.pdf",
    download: vi.fn().mockResolvedValue(undefined),
    durationMinutes: 20,
    progress: 35,
    completed: false,
    canTrackProgress: true,
    onSaveProgress: vi.fn().mockResolvedValue(undefined),
    onComplete: vi.fn().mockResolvedValue(undefined),
    onError: vi.fn(),
    ...overrides,
  };
  return { ...render(<CourseResourceReader {...props} />), props };
}

describe("course resource reader", () => {
  it("shows a progress bar, PDF viewer, and working download action", async () => {
    const { props } = renderReader();

    expect(screen.getByRole("progressbar", { name: "Course progress" })).toHaveAttribute(
      "aria-valuenow",
      "35",
    );
    expect(screen.getByTitle("Cellules.pdf")).toHaveAttribute(
      "src",
      "https://example.test/cellules.pdf",
    );
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(props.download).toHaveBeenCalledOnce());
  });

  it("saves playback progress and marks a direct video complete at its end", async () => {
    const { props } = renderReader({
      resourceTitle: "La cellule",
      resourceType: "video",
      resourceUrl: "https://cdn.example.test/cellule.mp4",
      progress: 0,
    });
    const video = screen.getByTitle("La cellule");
    Object.defineProperty(video, "duration", { configurable: true, value: 100 });
    Object.defineProperty(video, "currentTime", { configurable: true, value: 10 });
    fireEvent.timeUpdate(video);

    await waitFor(() => expect(props.onSaveProgress).toHaveBeenCalledWith(10));
    fireEvent.ended(video);
    await waitFor(() => expect(props.onComplete).toHaveBeenCalledOnce());
  });

  it("only creates embeds for supported secure video URLs", () => {
    expect(getVideoEmbedUrl("https://youtu.be/abc123")).toBe(
      "https://www.youtube-nocookie.com/embed/abc123",
    );
    expect(getVideoEmbedUrl("http://youtu.be/abc123")).toBeNull();
    expect(getVideoEmbedUrl("https://example.test/video")).toBeNull();
  });
});
