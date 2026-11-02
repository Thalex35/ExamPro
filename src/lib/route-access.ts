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

function isWithinPath(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function canAccessRolePath(pathname: string, roles: AppAreaRole[]) {
  if (roles.includes("admin")) return true;
  if (teacherPaths.some((path) => isWithinPath(pathname, path))) {
    return roles.includes("teacher");
  }
  if (adminPaths.some((path) => isWithinPath(pathname, path))) {
    return false;
  }
  if (studentPaths.some((path) => isWithinPath(pathname, path))) {
    return roles.includes("student");
  }
  return true;
}
