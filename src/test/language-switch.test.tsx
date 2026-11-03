import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageSwitch } from "@/components/LanguageSwitch";

const mocks = vi.hoisted(() => ({
  setLang: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    lang: "fr",
    setLang: mocks.setLang,
    t: () => "Language",
  }),
}));

describe("LanguageSwitch", () => {
  it("supports choosing a language without changing it before profile save", () => {
    const onChange = vi.fn();
    render(<LanguageSwitch value="fr" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "FR" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "KR" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "KR" }));

    expect(onChange).toHaveBeenCalledWith("ht");
    expect(mocks.setLang).not.toHaveBeenCalled();
  });
});
