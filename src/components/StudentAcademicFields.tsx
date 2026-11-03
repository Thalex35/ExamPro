import { Field, NativeSelect } from "@/components/Field";
type StudentAcademicFieldsProps = {
  levelName: string;
  requiresTrack: boolean;
  tracks: { id: string; code: string }[];
  trackId: string;
  onTrackChange: (trackId: string) => void;
  levelLabel: string;
  trackLabel: string;
  trackHint: string;
  selectLabel: string;
};

export function StudentAcademicFields({
  levelName,
  requiresTrack,
  tracks,
  trackId,
  onTrackChange,
  levelLabel,
  trackLabel,
  trackHint,
  selectLabel,
}: StudentAcademicFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={levelLabel} htmlFor="p-level">
        <NativeSelect id="p-level" value={levelName} disabled aria-readonly="true">
          <option value={levelName}>{levelName}</option>
        </NativeSelect>
      </Field>
      {requiresTrack && (
        <Field label={trackLabel} htmlFor="p-track" hint={trackHint}>
          <NativeSelect
            id="p-track"
            required
            value={trackId}
            onChange={(event) => onTrackChange(event.target.value)}
          >
            <option value="">{selectLabel}</option>
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.code}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
    </div>
  );
}
