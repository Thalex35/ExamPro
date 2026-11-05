import { describe, expect, it } from "vitest";
import { courseDescriptionWordCount, hasValidCourseDescriptionLength } from "@/lib/course-pedagogy";

describe("course description requirements", () => {
  it("counts words separated by whitespace", () => {
    expect(courseDescriptionWordCount("  one\t two\nthree  ")).toBe(3);
  });

  it("accepts descriptions from 80 through 250 words inclusively", () => {
    expect(hasValidCourseDescriptionLength(Array(80).fill("word").join(" "))).toBe(true);
    expect(hasValidCourseDescriptionLength(Array(250).fill("word").join(" "))).toBe(true);
  });

  it("rejects descriptions outside the required range", () => {
    expect(hasValidCourseDescriptionLength(Array(79).fill("word").join(" "))).toBe(false);
    expect(hasValidCourseDescriptionLength(Array(251).fill("word").join(" "))).toBe(false);
  });
});
