import { describe, expect, it } from "vitest";
import {
  haitiDepartments,
  isHaitiDepartment,
  isValidInternationalPhone,
  nextOnboardingStep,
  normalizePhoneNumber,
} from "@/lib/onboarding";

const levels = [
  { id: "langue", requires_track: false },
  { id: "ns4", requires_track: true },
];
const tracks = [
  { id: "ses", level_id: "ns4" },
  { id: "smb", level_id: "ns4" },
  { id: "svd", level_id: "ns4" },
];
const emptyProfile = {
  full_name: "Jean Pierre",
  level_id: null,
  track_id: null,
  geographical_department: null,
  school: null,
  phone: null,
};

describe("role-based onboarding progress", () => {
  it("requires a role before asking the student questions", () => {
    expect(nextOnboardingStep(null, emptyProfile, levels, tracks, [])).toBe("role");
  });

  it("asks for the student level and skips the track for a trackless level", () => {
    expect(nextOnboardingStep("student", emptyProfile, levels, tracks, [])).toBe("student-level");
    expect(
      nextOnboardingStep(
        "student",
        { ...emptyProfile, level_id: "langue", geographical_department: "Ouest" },
        levels,
        tracks,
        [],
      ),
    ).toBe("student-complete");
  });

  it("requires a valid catalog track for NS4 students", () => {
    expect(
      nextOnboardingStep(
        "student",
        { ...emptyProfile, level_id: "ns4", geographical_department: "Ouest" },
        levels,
        tracks,
        [],
      ),
    ).toBe("student-track");
    expect(
      nextOnboardingStep(
        "student",
        {
          ...emptyProfile,
          level_id: "ns4",
          geographical_department: "Ouest",
          track_id: "ses",
        },
        levels,
        tracks,
        [],
      ),
    ).toBe("student-complete");
    expect(
      nextOnboardingStep(
        "student",
        {
          ...emptyProfile,
          level_id: "ns4",
          geographical_department: "Ouest",
          track_id: "foreign-track",
        },
        levels,
        tracks,
        [],
      ),
    ).toBe("student-track");
  });

  it("requires a Haitian geographical department before a student filière", () => {
    expect(nextOnboardingStep("student", emptyProfile, levels, tracks, [])).toBe("student-level");
    expect(
      nextOnboardingStep("student", { ...emptyProfile, level_id: "ns4" }, levels, tracks, []),
    ).toBe("student-department");
    expect(isHaitiDepartment("Grand'Anse")).toBe(true);
    expect(isHaitiDepartment("SMP")).toBe(false);
    expect(haitiDepartments).toHaveLength(10);
  });

  it("requires a filière after geography only for levels that need one", () => {
    const geographySaved = {
      ...emptyProfile,
      geographical_department: "Ouest",
    };
    expect(nextOnboardingStep("student", geographySaved, levels, tracks, [])).toBe("student-level");
    expect(
      nextOnboardingStep("student", { ...geographySaved, level_id: "langue" }, levels, tracks, []),
    ).toBe("student-complete");
    expect(
      nextOnboardingStep("student", { ...geographySaved, level_id: "ns4" }, levels, tracks, []),
    ).toBe("student-track");
  });

  it("resumes teacher onboarding at the missing catalog assignment or phone step", () => {
    const withSchool = { ...emptyProfile, school: "École EXAMPRO" };
    expect(nextOnboardingStep("teacher", emptyProfile, levels, tracks, [])).toBe("teacher-school");
    expect(nextOnboardingStep("teacher", withSchool, levels, tracks, [])).toBe("teacher-levels");
    expect(
      nextOnboardingStep("teacher", withSchool, levels, tracks, [
        { level_id: "ns4", track_id: null },
      ]),
    ).toBe("teacher-tracks");
    expect(
      nextOnboardingStep("teacher", withSchool, levels, tracks, [
        { level_id: "ns4", track_id: "smb" },
      ]),
    ).toBe("teacher-phone");
    expect(
      nextOnboardingStep("teacher", { ...withSchool, phone: "+509 3700-0000" }, levels, tracks, [
        { level_id: "langue", track_id: null },
      ]),
    ).toBe("teacher-complete");
  });

  it("normalizes separators and validates international phone numbers", () => {
    expect(normalizePhoneNumber("+509 (3700) 0000")).toBe("+50937000000");
    expect(isValidInternationalPhone("+509 (3700) 0000")).toBe(true);
    expect(isValidInternationalPhone("3700-0000")).toBe(false);
    expect(isValidInternationalPhone("+0123456789")).toBe(false);
  });
});
