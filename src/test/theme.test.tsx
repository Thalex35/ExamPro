import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeProvider } from "@/lib/theme";

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => (key === "theme.switchToDark" ? "Enable dark theme" : "Enable light theme"),
  }),
}));

describe("global theme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
  });

  it("defaults to light and persists an immediate theme toggle", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(document.documentElement).not.toHaveClass("dark");
    fireEvent.click(screen.getByRole("button", { name: "Enable dark theme" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem("exampro-theme")).toBe("dark");
  });

  it("restores a saved dark theme", () => {
    window.localStorage.setItem("exampro-theme", "dark");
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByRole("button", { name: "Enable light theme" })).toBeInTheDocument();
  });
});
