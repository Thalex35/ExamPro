export type OnboardingRole = "student" | "teacher";
export type OnboardingStep =
  | "name"
  | "role"
  | "student-level"
  | "student-department"
  | "student-track"
  | "student-complete"
  | "teacher-school"
  | "teacher-levels"
  | "teacher-tracks"
  | "teacher-phone"
  | "teacher-complete";

type OnboardingProfile = {
  full_name: string | null;
  level_id: string | null;
  track_id: string | null;
  geographical_department: string | null;
  school: string | null;
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
  if (!role) return "role";
  if (!profile.full_name?.trim()) return "name";

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
    return "student-complete";
  }

  if (!profile.school?.trim()) return "teacher-school";
  if (!teacherAssignments.length) return "teacher-levels";

  const missingTrack = teacherAssignments.some((assignment) => {
    const level = levels.find((candidate) => candidate.id === assignment.level_id);
    return level?.requires_track && !assignment.track_id;
  });
  if (missingTrack) return "teacher-tracks";
  if (!isValidInternationalPhone(profile.phone)) return "teacher-phone";
  return "teacher-complete";
}
