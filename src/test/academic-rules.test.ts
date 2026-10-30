import { describe, expect, it } from "vitest";
import { subjectsFor, type Catalog } from "@/lib/catalog";
import { validateExamFile } from "@/lib/files";

const c = {
  levels: [
    { id: "9e", requires_track: false },
    { id: "term", requires_track: true },
  ],
  tracks: [{ id: "smp", level_id: "term" }, { id: "ses", level_id: "term" }],
  subjects: [{ id: "math" }, { id: "phys" }, { id: "eco" }],
  levelSubjects: [
    { level_id: "9e", subject_id: "math" },
    { level_id: "term", subject_id: "math" },
    { level_id: "term", subject_id: "phys" },
    { level_id: "term", subject_id: "eco" },
  ],
  trackSubjects: [
    { track_id: "smp", subject_id: "math" },
    { track_id: "smp", subject_id: "phys" },
    { track_id: "ses", subject_id: "eco" },
  ],
  chapters: [],
  topics: [],
} as unknown as Catalog;

describe("academic rules", () => {
  it("9e students see level subjects without a track", () => {
    expect(subjectsFor(c, "9e", null).map((s) => s.id)).toEqual(["math"]);
  });
  it("Terminale SMP students only see SMP subjects", () => {
    expect(subjectsFor(c, "term", "smp").map((s) => s.id)).toEqual(["math", "phys"]);
  });
  it("Terminale SES students do not see Physique", () => {
    expect(subjectsFor(c, "term", "ses").map((s) => s.id)).toEqual(["eco"]);
  });
  it("exam uploads must be PDFs of at most 20 MB", () => {
    expect(validateExamFile(null)).toBe("FILE_REQUIRED");
    expect(validateExamFile({ name: "a.docx", type: "application/msword", size: 10 })).toBe("FILE_TYPE");
    expect(validateExamFile({ name: "a.pdf", type: "application/pdf", size: 21 * 1024 * 1024 })).toBe("FILE_SIZE");
    expect(validateExamFile({ name: "a.pdf", type: "application/pdf", size: 1024 })).toBeNull();
  });
});
