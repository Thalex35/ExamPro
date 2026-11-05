export type AppAreaRole = "admin" | "student" | "teacher";

const teacherPaths = ["/teacher"];
const adminPaths = ["/admin"];
const studentPaths = [
  "/dashboard",
  "/subjects",
  "/exams",
  "/courses",
  "/favorites",
  "/evaluations",
  "/progress",
];
const sharedPaths = ["/profile", "/onboarding", "/notifications"];
const sharedPublishedContentPaths = ["/courses"];

function isWithinPath(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function canAccessRolePath(pathname: string, roles: AppAreaRole[]) {
  if (sharedPaths.some((path) => isWithinPath(pathname, path))) return true;
  if (adminPaths.some((path) => isWithinPath(pathname, path))) {
    return roles.includes("admin");
  }
  if (sharedPublishedContentPaths.some((path) => isWithinPath(pathname, path))) {
    return roles.some((role) => role === "admin" || role === "teacher" || role === "student");
  }
  if (roles.includes("admin")) return false;
  if (teacherPaths.some((path) => isWithinPath(pathname, path))) {
    return roles.includes("teacher");
  }
  if (studentPaths.some((path) => isWithinPath(pathname, path))) {
    return roles.includes("student");
  }
  return false;
}
