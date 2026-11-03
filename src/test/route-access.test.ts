import { describe, expect, it } from "vitest";
import { canAccessRolePath } from "@/lib/route-access";

describe("role-specific route access", () => {
  it("allows teachers and denies non-teachers from teacher pages", () => {
    expect(canAccessRolePath("/teacher", ["teacher"])).toBe(true);
    expect(canAccessRolePath("/teacher/courses/new", ["student"])).toBe(false);
    expect(canAccessRolePath("/teacher/courses/new", [])).toBe(false);
  });

  it("allows academic resource browsing but keeps student learning areas restricted", () => {
    expect(canAccessRolePath("/dashboard", ["student"])).toBe(true);
    expect(canAccessRolePath("/courses/example", ["teacher"])).toBe(true);
    expect(canAccessRolePath("/exams", ["teacher"])).toBe(false);
  });

  it("restricts administrator routes to administrators", () => {
    expect(canAccessRolePath("/admin", ["admin"])).toBe(true);
    expect(canAccessRolePath("/admin/users", ["teacher"])).toBe(false);
    expect(canAccessRolePath("/admin", ["student"])).toBe(false);
  });

  it("keeps administrator and teacher workspaces separate", () => {
    expect(canAccessRolePath("/teacher/courses/new", ["admin"])).toBe(false);
    expect(canAccessRolePath("/admin/courses", ["teacher"])).toBe(false);
    expect(canAccessRolePath("/teacher/exams", ["teacher"])).toBe(true);
    expect(canAccessRolePath("/admin/users", ["admin"])).toBe(true);
  });

  it("allows shared profile and onboarding routes", () => {
    expect(canAccessRolePath("/profile", ["teacher"])).toBe(true);
    expect(canAccessRolePath("/onboarding", ["student"])).toBe(true);
  });
});
