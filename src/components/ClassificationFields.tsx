import { useI18n } from "@/lib/i18n";
import {
  chaptersFor,
  subjectsFor,
  subjectsForLevel,
  topicsFor,
  tracksFor,
  type Catalog,
} from "@/lib/catalog";
import { Field, NativeSelect } from "./Field";

export type Classification = {
  level_id: string;
  track_id: string;
  subject_id: string;
  chapter_id: string;
  topic_id: string;
};

/** Level → track → subject → chapter → topic pickers driven entirely by the academic catalog. */
export function ClassificationFields({
  c,
  value,
  onChange,
  withChapters = true,
  withTopics = true,
}: {
  c: Catalog;
  value: Classification;
  onChange: (v: Classification) => void;
  withChapters?: boolean;
  withTopics?: boolean;
}) {
  const { t, name } = useI18n();
  const level = c.levels.find((l) => l.id === value.level_id);
  const tracks = tracksFor(c, value.level_id);
  const subjects = value.track_id
    ? subjectsFor(c, value.level_id, value.track_id)
    : subjectsForLevel(c, value.level_id);
  const chapters = chaptersFor(c, value.subject_id, value.level_id);
  const topics = topicsFor(c, value.chapter_id);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("form.level")} htmlFor="f-level">
        <NativeSelect
          id="f-level"
          required
          value={value.level_id}
          onChange={(e) =>
            onChange({
              level_id: e.target.value,
              track_id: "",
              subject_id: "",
              chapter_id: "",
              topic_id: "",
            })
          }
        >
          <option value="">{t("common.select")}</option>
          {c.levels.map((l) => (
            <option key={l.id} value={l.id}>
              {name(l)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {level?.requires_track && (
        <Field label={t("form.track")} htmlFor="f-track">
          <NativeSelect
            id="f-track"
            value={value.track_id}
            onChange={(e) =>
              onChange({
                ...value,
                track_id: e.target.value,
                subject_id: "",
                chapter_id: "",
                topic_id: "",
              })
            }
          >
            <option value="">{t("form.trackAll")}</option>
            {tracks.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.code} — {name(tr)}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field label={t("form.subject")} htmlFor="f-subject">
        <NativeSelect
          id="f-subject"
          required
          disabled={!value.level_id}
          value={value.subject_id}
          onChange={(e) =>
            onChange({ ...value, subject_id: e.target.value, chapter_id: "", topic_id: "" })
          }
        >
          <option value="">{t("common.select")}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {name(s)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {withChapters && (
        <>
          <Field label={t("form.chapter")} htmlFor="f-chapter">
            <NativeSelect
              id="f-chapter"
              disabled={!chapters.length}
              value={value.chapter_id}
              onChange={(e) => onChange({ ...value, chapter_id: e.target.value, topic_id: "" })}
            >
              <option value="">{t("common.none")}</option>
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {name(ch)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {withTopics && (
            <Field label={t("form.topic")} htmlFor="f-topic">
              <NativeSelect
                id="f-topic"
                disabled={!topics.length}
                value={value.topic_id}
                onChange={(e) => onChange({ ...value, topic_id: e.target.value })}
              >
                <option value="">{t("common.none")}</option>
                {topics.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {name(tp)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
        </>
      )}
    </div>
  );
}
