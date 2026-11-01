import { describe, expect, it } from "vitest";
import {
  chaptersFor,
  isPrioritySubject,
  subjectsFor,
  subjectsForLevel,
  topicsFor,
  type Catalog,
} from "@/lib/catalog";
import { validateExamFile } from "@/lib/files";

const c = {
  levels: [
    { id: "9e", requires_track: false },
    { id: "term", requires_track: true },
  ],
  tracks: [
    { id: "smp", level_id: "term", code: "SMP" },
    { id: "svt", level_id: "term", code: "SVT" },
    { id: "lla", level_id: "term", code: "LLA" },
    { id: "ses", level_id: "term", code: "SES" },
    { id: "wrong-level", level_id: "9e", code: "SMP" },
  ],
  subjects: [
    { id: "math", slug: "mathematiques", name_fr: "Mathématiques" },
    { id: "phys", slug: "physique", name_fr: "Physique" },
    { id: "biology", slug: "biologie", name_fr: "Biologie" },
    { id: "chemistry", slug: "chimie", name_fr: "Chimie" },
    { id: "geology", slug: "geologie", name_fr: "Géologie" },
    { id: "english", slug: "anglais", name_fr: "Anglais" },
    { id: "arts", slug: "arts", name_fr: "Arts" },
    { id: "creole", slug: "creole", name_fr: "Créole" },
    { id: "spanish", slug: "espagnol", name_fr: "Espagnol" },
    { id: "philosophy", slug: "philosophie", name_fr: "Philosophie" },
    { id: "social", slug: "sciences-sociales", name_fr: "Sciences sociales" },
    { id: "economics", slug: "economie", name_fr: "Économie" },
    { id: "french", slug: "francais", name_fr: "Français" },
    { id: "experimental", slug: "sciences-experimentales", name_fr: "Sciences expérimentales" },
  ],
  levelSubjects: [
    ...["math", "french", "creole", "english", "spanish", "experimental", "social"].map(
      (subject_id) => ({ level_id: "9e", subject_id }),
    ),
    ...[
      "math",
      "phys",
      "biology",
      "chemistry",
      "geology",
      "english",
      "arts",
      "creole",
      "spanish",
      "french",
      "philosophy",
      "social",
      "economics",
    ].map((subject_id) => ({ level_id: "term", subject_id })),
  ],
  trackSubjects: [
    { track_id: "smp", subject_id: "math" },
    { track_id: "smp", subject_id: "phys" },
    ...["biology", "chemistry", "geology"].map((subject_id) => ({ track_id: "svt", subject_id })),
    ...["english", "arts", "creole", "spanish", "french", "philosophy"].map((subject_id) => ({
      track_id: "lla",
      subject_id,
    })),
    ...["social", "economics"].map((subject_id) => ({ track_id: "ses", subject_id })),
  ],
  chapters: [
    { id: "math-chapter-9e", subject_id: "math", level_id: "9e" },
    { id: "math-chapter-term", subject_id: "math", level_id: "term" },
    { id: "biology-chapter-term", subject_id: "biology", level_id: "term" },
  ],
  topics: [
    { id: "math-topic", chapter_id: "math-chapter-9e" },
    { id: "biology-topic", chapter_id: "biology-chapter-term" },
  ],
} as unknown as Catalog;

describe("academic rules", () => {
  it("9e students see all level subjects without requiring a track", () => {
    const subjects = subjectsFor(c, "9e");
    expect(subjects).toHaveLength(7);
    expect(subjectsForLevel(c, "9e").map((subject) => subject.id)).toHaveLength(7);
    expect(subjects.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        "math",
        "french",
        "creole",
        "english",
        "spanish",
        "experimental",
        "social",
      ]),
    );
  });
  it.each([
    ["SMP", "smp", ["math", "phys"]],
    ["SVT", "svt", ["biology", "chemistry", "geology"]],
    ["LLA", "lla", ["english", "arts", "creole", "spanish", "french", "philosophy"]],
    ["SES", "ses", ["economics", "social"]],
  ])("Terminale %s students see all and only their track subjects", (_code, trackId, expected) => {
    expect(subjectsFor(c, "term", trackId).map((s) => s.id)).toEqual(expected);
  });
  it("does not show cross-track subjects when the required track is absent or invalid", () => {
    expect(subjectsFor(c, "term").map((s) => s.id)).toEqual([]);
    expect(subjectsFor(c, "term", "wrong-level").map((s) => s.id)).toEqual([]);
  });
  it("prioritizes SMP core subjects without hiding the other subjects", () => {
    const smp = subjectsFor(c, "term", "smp");
    const smpTrack = c.tracks.find((item) => item.id === "smp");
    expect(smp.map((s) => s.id)).toEqual(["math", "phys"]);
    expect(smp.every((subject) => isPrioritySubject(subject, smpTrack, c.trackSubjects))).toBe(
      true,
    );

    const svt = subjectsFor(c, "term", "svt");
    const svtTrack = c.tracks.find((item) => item.id === "svt");
    expect(svt.map((subject) => subject.id)).toEqual(["biology", "chemistry", "geology"]);
    expect(svt.every((subject) => isPrioritySubject(subject, svtTrack, c.trackSubjects))).toBe(
      true,
    );
  });
  it.each([
    ["SMP", "smp", ["math", "phys"]],
    ["SVT", "svt", ["biology", "chemistry", "geology"]],
    ["LLA", "lla", ["english", "arts", "creole", "spanish", "french", "philosophy"]],
    ["SES", "ses", ["social", "economics"]],
  ])(
    "shows every Terminale subject and prioritizes %s subjects",
    (_code, trackId, expectedPriority) => {
      const subjects = subjectsForLevel(c, "term", trackId);
      const ids = subjects.map((subject) => subject.id);
      const track = c.tracks.find((candidate) => candidate.id === trackId);
      const priority = subjects
        .filter((subject) => isPrioritySubject(subject, track, c.trackSubjects))
        .map((subject) => subject.id);
      const expectedPriorityInDisplayOrder = [...expectedPriority].sort((a, b) =>
        c.subjects
          .find((subject) => subject.id === a)!
          .name_fr.localeCompare(c.subjects.find((subject) => subject.id === b)!.name_fr),
      );

      expect(ids).toHaveLength(13);
      expect(ids).toEqual(
        expect.arrayContaining(
          c.levelSubjects.filter((x) => x.level_id === "term").map((x) => x.subject_id),
        ),
      );
      expect(new Set(priority)).toEqual(new Set(expectedPriority));
      expect(ids.slice(0, priority.length)).toEqual(expectedPriorityInDisplayOrder);
      expect(ids).toContain("math");
      expect(ids).toContain("economics");
    },
  );
  it("allows opening a non-priority subject and its level chapters", () => {
    const subjects = subjectsForLevel(c, "term", "smp");
    expect(subjects.some((subject) => subject.id === "biology")).toBe(true);
    const biologyChapters = chaptersFor(c, "biology", "term");
    expect(biologyChapters.map((chapter) => chapter.id)).toEqual(["biology-chapter-term"]);
    expect(topicsFor(c, "biology-chapter-term").map((topic) => topic.id)).toEqual([
      "biology-topic",
    ]);
  });
  it("loads chapters and topics only for the selected subject and level", () => {
    expect(chaptersFor(c, "math", "9e").map((chapter) => chapter.id)).toEqual(["math-chapter-9e"]);
    expect(topicsFor(c, "math-chapter-9e").map((topic) => topic.id)).toEqual(["math-topic"]);
  });
  it("exam uploads must be PDFs of at most 20 MB", () => {
    expect(validateExamFile(null)).toBe("FILE_REQUIRED");
    expect(validateExamFile({ name: "a.docx", type: "application/msword", size: 10 })).toBe(
      "FILE_TYPE",
    );
    expect(
      validateExamFile({ name: "a.pdf", type: "application/pdf", size: 21 * 1024 * 1024 }),
    ).toBe("FILE_SIZE");
    expect(validateExamFile({ name: "a.pdf", type: "application/pdf", size: 1024 })).toBeNull();
  });
});
