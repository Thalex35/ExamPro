export type OnboardingRole = "student" | "teacher";
export type OnboardingStep =
  | "name"
  | "role"
  | "student-level"
  | "student-department"
  | "student-track"
  | "student-school"
  | "student-complete"
  | "teacher-department"
  | "teacher-school"
  | "teacher-levels"
  | "teacher-tracks"
  | "teacher-phone"
  | "teacher-complete";

type OnboardingProfile = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  level_id: string | null;
  track_id: string | null;
  geographical_department: string | null;
  school: string | null;
  school_id: string | null;
  school_email: string | null;
  school_phone: string | null;
  teacher_school_contacts_confirmed: boolean;
  phone: string | null;
};

type CatalogLevel = { id: string; requires_track: boolean };
type CatalogTrack = { id: string; level_id: string };
type TeacherAssignment = { level_id: string; track_id: string | null };

export const haitiDepartments = [
  "Artibonite",
  "Centre",
  "Grand'Anse",
  "Nippes",
  "Nord",
  "Nord-Est",
  "Nord-Ouest",
  "Ouest",
  "Sud",
  "Sud-Est",
] as const;

export function isHaitiDepartment(
  value: string | null,
): value is (typeof haitiDepartments)[number] {
  return value !== null && haitiDepartments.some((department) => department === value);
}

export function isValidSchoolName(value: string | null | undefined) {
  const name = value?.trim() ?? "";
  return name.length >= 2 && name.length <= 200;
}

export function normalizePhoneNumber(phone: string) {
  return phone.replace(/[\s().-]/g, "");
}

export function isValidInternationalPhone(phone: string | null | undefined) {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhoneNumber(phone ?? ""));
}

export function nextOnboardingStep(
  role: OnboardingRole | null,
  profile: OnboardingProfile,
  levels: CatalogLevel[],
  tracks: CatalogTrack[],
  teacherAssignments: TeacherAssignment[],
): OnboardingStep {
  if (!profile.first_name?.trim() || !profile.last_name?.trim()) return "name";
  if (!role) return "role";

  if (role === "student") {
    const level = levels.find((candidate) => candidate.id === profile.level_id);
    if (!level) return "student-level";
    if (!isHaitiDepartment(profile.geographical_department)) {
      return "student-department";
    }
    if (
      level.requires_track &&
      !tracks.some((track) => track.id === profile.track_id && track.level_id === level.id)
    ) {
      return "student-track";
    }
    if (!isValidSchoolName(profile.school)) return "student-school";
    return "student-complete";
  }

  if (!isHaitiDepartment(profile.geographical_department)) return "teacher-department";
  if (
    !profile.school_id ||
    !profile.teacher_school_contacts_confirmed ||
    !profile.school_email?.trim() ||
    !profile.school_phone?.trim()
  ) {
    return "teacher-school";
  }
  if (!teacherAssignments.length) return "teacher-levels";

  const missingTrack = teacherAssignments.some((assignment) => {
    const level = levels.find((candidate) => candidate.id === assignment.level_id);
    return level?.requires_track && !assignment.track_id;
  });
  if (missingTrack) return "teacher-tracks";
  if (!isValidInternationalPhone(profile.phone)) return "teacher-phone";
  return "teacher-complete";
}
