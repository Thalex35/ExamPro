import { describe, expect, it } from "vitest";
import {
  haitiDepartments,
  isHaitiDepartment,
  isValidInternationalPhone,
  nextOnboardingStep,
  normalizePhoneNumber,
} from "@/lib/onboarding";

const levels = [
  { id: "9e-af", requires_track: false },
  { id: "terminale", requires_track: true },
];
const tracks = [
  { id: "smp", level_id: "terminale" },
  { id: "svt", level_id: "terminale" },
  { id: "lla", level_id: "terminale" },
  { id: "ses", level_id: "terminale" },
];
const emptyProfile = {
  full_name: null,
  first_name: null,
  last_name: null,
  level_id: null,
  track_id: null,
  geographical_department: null,
  school: null,
  school_id: null,
  teacher_school_contacts_confirmed: false,
  phone: null,
};
const namedProfile = {
  ...emptyProfile,
  full_name: "Jean Pierre",
  first_name: "Jean",
  last_name: "Pierre",
};

describe("role-based onboarding progress", () => {
  it("asks for names before the role selection", () => {
    expect(nextOnboardingStep(null, emptyProfile, levels, tracks, [])).toBe("name");
    expect(nextOnboardingStep(null, namedProfile, levels, tracks, [])).toBe("role");
  });

  it("asks for the student level and skips the track for a trackless level", () => {
    expect(nextOnboardingStep("student", namedProfile, levels, tracks, [])).toBe("student-level");
    expect(
      nextOnboardingStep(
        "student",
        { ...namedProfile, level_id: "9e-af", geographical_department: "Ouest" },
        levels,
        tracks,
        [],
      ),
    ).toBe("student-complete");
  });

  it("requires a valid catalog track for Terminale students", () => {
    expect(
      nextOnboardingStep(
        "student",
        { ...namedProfile, level_id: "terminale", geographical_department: "Ouest" },
        levels,
        tracks,
        [],
      ),
    ).toBe("student-track");
    expect(
      nextOnboardingStep(
        "student",
        {
          ...namedProfile,
          level_id: "terminale",
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
          ...namedProfile,
          level_id: "terminale",
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
    expect(nextOnboardingStep("student", namedProfile, levels, tracks, [])).toBe("student-level");
    expect(
      nextOnboardingStep("student", { ...namedProfile, level_id: "terminale" }, levels, tracks, []),
    ).toBe("student-department");
    expect(isHaitiDepartment("Grand'Anse")).toBe(true);
    expect(isHaitiDepartment("SMP")).toBe(false);
    expect(haitiDepartments).toHaveLength(10);
  });

  it("requires a filière after geography only for levels that need one", () => {
    const geographySaved = {
      ...namedProfile,
      geographical_department: "Ouest",
    };
    expect(nextOnboardingStep("student", geographySaved, levels, tracks, [])).toBe("student-level");
    expect(
      nextOnboardingStep("student", { ...geographySaved, level_id: "9e-af" }, levels, tracks, []),
    ).toBe("student-complete");
    expect(
      nextOnboardingStep(
        "student",
        { ...geographySaved, level_id: "terminale" },
        levels,
        tracks,
        [],
      ),
    ).toBe("student-track");
  });

  it("resumes teacher onboarding at the missing school, assignment, or phone step", () => {
    const withDepartment = {
      ...namedProfile,
      geographical_department: "Ouest",
    };
    const withSchool = {
      ...withDepartment,
      school: "École EXAMPRO",
      school_id: "school-id",
      teacher_school_contacts_confirmed: true,
    };
    expect(nextOnboardingStep("teacher", namedProfile, levels, tracks, [])).toBe(
      "teacher-department",
    );
    expect(nextOnboardingStep("teacher", withDepartment, levels, tracks, [])).toBe(
      "teacher-school",
    );
    expect(
      nextOnboardingStep(
        "teacher",
        { ...withSchool, teacher_school_contacts_confirmed: false },
        levels,
        tracks,
        [],
      ),
    ).toBe("teacher-school-contact");
    expect(nextOnboardingStep("teacher", withSchool, levels, tracks, [])).toBe("teacher-levels");
    expect(
      nextOnboardingStep("teacher", withSchool, levels, tracks, [
        { level_id: "terminale", track_id: null },
      ]),
    ).toBe("teacher-tracks");
    expect(
      nextOnboardingStep("teacher", withSchool, levels, tracks, [
        { level_id: "terminale", track_id: "smp" },
      ]),
    ).toBe("teacher-phone");
    expect(
      nextOnboardingStep("teacher", { ...withSchool, phone: "+509 3700-0000" }, levels, tracks, [
        { level_id: "9e-af", track_id: null },
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
