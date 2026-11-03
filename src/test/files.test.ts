import { describe, expect, it } from "vitest";
import { isSecureExternalUrl, validateCourseFile } from "@/lib/files";

describe("course resource validation", () => {
  it("accepts HTTPS links and rejects other or invalid URLs", () => {
    expect(isSecureExternalUrl("https://www.youtube.com/watch?v=abc")).toBe(true);
    expect(isSecureExternalUrl("http://example.com")).toBe(false);
    expect(isSecureExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSecureExternalUrl("not a URL")).toBe(false);
  });

  it("requires a PDF no larger than 20 MiB", () => {
    expect(validateCourseFile(null)).toBe("FILE_REQUIRED");
    expect(validateCourseFile({ name: "lesson.docx", type: "application/msword", size: 1 })).toBe(
      "FILE_TYPE",
    );
    expect(
      validateCourseFile({ name: "lesson.pdf", type: "application/pdf", size: 20 * 1024 * 1024 }),
    ).toBeNull();
    expect(
      validateCourseFile({
        name: "lesson.pdf",
        type: "application/pdf",
        size: 20 * 1024 * 1024 + 1,
      }),
    ).toBe("FILE_SIZE");
  });
});
