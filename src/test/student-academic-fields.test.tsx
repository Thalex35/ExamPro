import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StudentAcademicFields } from "@/components/StudentAcademicFields";

const tracks = [
  { id: "smp", code: "SMP" },
  { id: "svt", code: "SVT" },
  { id: "lla", code: "LLA" },
  { id: "ses", code: "SES" },
];

function renderFields(level: "9e" | "terminale", onTrackChange = vi.fn()) {
  return {
    onTrackChange,
    ...render(
      <StudentAcademicFields
        levelName={level === "9e" ? "9ème Année" : "Terminale"}
        requiresTrack={level === "terminale"}
        tracks={tracks}
        trackId={level === "terminale" ? "smp" : ""}
        onTrackChange={onTrackChange}
        levelLabel="Niveau"
        trackLabel="Filière"
        trackHint="Choisissez votre filière"
        selectLabel="Choisir"
      />,
    ),
  };
}

describe("student profile academic fields", () => {
  it("keeps a 9ème Année level fixed and hides the filière selector", () => {
    renderFields("9e");

    expect(screen.getByLabelText("Niveau")).toBeDisabled();
    expect(screen.getByLabelText("Niveau")).toHaveValue("9ème Année");
    expect(screen.queryByLabelText("Filière")).not.toBeInTheDocument();
  });

  it("keeps Terminale fixed while allowing selection of each filière", () => {
    const { onTrackChange } = renderFields("terminale");
    const level = screen.getByLabelText("Niveau");
    const track = screen.getByLabelText<HTMLSelectElement>("Filière");

    expect(level).toBeDisabled();
    expect(level).toHaveValue("Terminale");
    expect(Array.from(track.options).map((option) => option.text)).toEqual([
      "Choisir",
      "SMP",
      "SVT",
      "LLA",
      "SES",
    ]);

    fireEvent.change(track, { target: { value: "svt" } });
    expect(onTrackChange).toHaveBeenCalledWith("svt");
  });
});
