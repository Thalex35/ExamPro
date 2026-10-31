import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { GraduationCap, PenSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import {
  isValidInternationalPhone,
  nextOnboardingStep,
  normalizePhoneNumber,
  type OnboardingRole,
  type OnboardingStep,
} from "@/lib/onboarding";
import { useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/Field";
import { ErrorState, Loading } from "@/components/States";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

async function assertRpc(request: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await request;
  if (error) throw error;
}

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Profil — EXAMPRO" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { t, name, errMsg } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me, isLoading: meLoading } = useMe();
  const catalog = useQuery(catalogQuery);
  const userId = me?.user.id;
  const assignments = useQuery({
    queryKey: ["teacher-onboarding-assignments", userId],
    enabled: !!userId && !!me?.isTeacher,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_academic_assignments")
        .select("level_id,track_id")
        .eq("teacher_id", userId!);
      if (error) throw error;
      return data;
    },
  });

  const [step, setStep] = useState<OnboardingStep | null>(null);
  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [roleChoice, setRoleChoice] = useState<OnboardingRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [levelId, setLevelId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [school, setSchool] = useState("");
  const [teacherLevelIds, setTeacherLevelIds] = useState<string[]>([]);
  const [teacherTrackIds, setTeacherTrackIds] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || meLoading || catalog.isLoading || !me?.profile || !catalog.data)
      return;
    if (me.isTeacher && assignments.isLoading) return;

    const savedRole: OnboardingRole | null = me.isTeacher
      ? "teacher"
      : me.isStudent
        ? "student"
        : null;
    const savedAssignments = assignments.data ?? [];
    setRole(savedRole);
    setRoleChoice(savedRole);
    setFullName(me.profile.full_name ?? "");
    setLevelId(me.profile.level_id ?? "");
    setTrackId(me.profile.track_id ?? "");
    setSchool(me.profile.school ?? "");
    setTeacherLevelIds([...new Set(savedAssignments.map((assignment) => assignment.level_id))]);
    setTeacherTrackIds(
      savedAssignments.flatMap((assignment) => (assignment.track_id ? [assignment.track_id] : [])),
    );
    setPhone(me.profile.phone ?? "");
    setStep(
      nextOnboardingStep(
        savedRole,
        me.profile,
        catalog.data.levels,
        catalog.data.tracks,
        savedAssignments,
      ),
    );
    initialized.current = true;
  }, [assignments.data, assignments.isLoading, catalog.data, catalog.isLoading, me, meLoading]);

  if (meLoading || catalog.isLoading || (me?.isTeacher && assignments.isLoading)) {
    return <Loading />;
  }
  if (catalog.error || !catalog.data) {
    return <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />;
  }
  if (assignments.error) {
    return <ErrorState error={assignments.error} onRetry={() => assignments.refetch()} />;
  }
  if (!me?.profile) {
    return <ErrorState error={new Error(t("onb.loadError"))} />;
  }
  const profile = me.profile;
  if (!step || !initialized.current) return <Loading />;

  const c = catalog.data;
  const savedAssignments = assignments.data ?? [];
  const flow = getFlowSteps(role, profile, c.levels, savedAssignments);
  const stepIndex = Math.max(0, flow.indexOf(step));
  const progressValue = Math.min(100, ((stepIndex + 1) / flow.length) * 100);
  const studentTracks = c.tracks.filter((track) => track.level_id === levelId);
  const requiredTeacherLevels = teacherLevelIds.filter(
    (id) => c.levels.find((level) => level.id === id)?.requires_track,
  );
  const teacherTracks = c.tracks.filter((track) => requiredTeacherLevels.includes(track.level_id));

  async function saveName() {
    const value = fullName.trim();
    if (!value || value.length > 120) {
      setValidationError(t("onb.nameRequired"));
      return;
    }
    await run(async () => {
      await assertRpc(supabase.rpc("save_onboarding_name", { _full_name: value }));
      await qc.invalidateQueries({ queryKey: ["me"] });
      setStep(
        nextOnboardingStep(
          role,
          { ...profile, full_name: value },
          c.levels,
          c.tracks,
          savedAssignments,
        ),
      );
    });
  }

  async function chooseRole() {
    if (!roleChoice) {
      setValidationError(t("onb.selectRole"));
      return;
    }
    await run(async () => {
      await assertRpc(
        supabase.rpc("complete_onboarding", {
          _role: roleChoice,
          _full_name: profile.full_name ?? null,
          _level_id: null,
          _track_id: null,
          _subject_ids: [],
          _school: null,
          _department: null,
        }),
      );
      setRole(roleChoice);
      await qc.invalidateQueries({ queryKey: ["me"] });
      setStep(
        nextOnboardingStep(
          roleChoice,
          profile,
          c.levels,
          c.tracks,
          roleChoice === "teacher" ? savedAssignments : [],
        ),
      );
    });
  }

  async function saveStudentLevel() {
    if (!levelId) {
      setValidationError(t("onb.levelRequired"));
      return;
    }
    const selectedLevel = c.levels.find((level) => level.id === levelId);
    if (!selectedLevel) {
      setValidationError(t("onb.levelRequired"));
      return;
    }
    await run(async () => {
      await assertRpc(supabase.rpc("save_student_onboarding_level", { _level_id: levelId }));
      setTrackId("");
      await qc.invalidateQueries({ queryKey: ["me"] });
      if (selectedLevel.requires_track) {
        setStep("student-track");
      } else {
        await completeStudent();
      }
    });
  }

  async function saveStudentTrack() {
    if (!studentTracks.some((track) => track.id === trackId)) {
      setValidationError(t("onb.trackRequired"));
      return;
    }
    await run(async () => {
      await assertRpc(supabase.rpc("save_student_onboarding_track", { _track_id: trackId }));
      await qc.invalidateQueries({ queryKey: ["me"] });
      await completeStudent();
    });
  }

  async function saveTeacherSchool() {
    const value = school.trim();
    if (!value || value.length > 200) {
      setValidationError(t("onb.schoolRequired"));
      return;
    }
    await run(async () => {
      await assertRpc(supabase.rpc("save_teacher_onboarding_school", { _school: value }));
      await qc.invalidateQueries({ queryKey: ["me"] });
      setStep("teacher-levels");
    });
  }

  async function saveTeacherLevels() {
    if (!teacherLevelIds.length) {
      setValidationError(t("onb.levelRequired"));
      return;
    }
    await run(async () => {
      await assertRpc(
        supabase.rpc("save_teacher_onboarding_levels", { _level_ids: teacherLevelIds }),
      );
      setTeacherTrackIds([]);
      await qc.invalidateQueries({ queryKey: ["teacher-onboarding-assignments", userId] });
      setStep(
        teacherLevelIds.some((id) => c.levels.find((level) => level.id === id)?.requires_track)
          ? "teacher-tracks"
          : "teacher-phone",
      );
    });
  }

  async function saveTeacherTracks() {
    const missingTrack = requiredTeacherLevels.some(
      (id) =>
        !teacherTrackIds.some((trackId) =>
          c.tracks.some((track) => track.id === trackId && track.level_id === id),
        ),
    );
    if (!teacherTrackIds.length || missingTrack) {
      setValidationError(t("onb.trackRequired"));
      return;
    }
    await run(async () => {
      await assertRpc(
        supabase.rpc("save_teacher_onboarding_tracks", { _track_ids: teacherTrackIds }),
      );
      await qc.invalidateQueries({ queryKey: ["teacher-onboarding-assignments", userId] });
      setStep("teacher-phone");
    });
  }

  async function finishTeacher() {
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!isValidInternationalPhone(normalizedPhone)) {
      setValidationError(t("onb.phoneInvalid"));
      return;
    }
    await run(async () => {
      await assertRpc(supabase.rpc("finish_teacher_onboarding", { _phone: normalizedPhone }));
      await qc.invalidateQueries({ queryKey: ["me"] });
      setStep("teacher-complete");
    });
  }

  async function completeStudent() {
    await assertRpc(supabase.rpc("finish_student_onboarding"));
    await qc.invalidateQueries({ queryKey: ["me"] });
    setStep("student-complete");
  }

  async function submitStudentCompletion() {
    await run(async () => {
      if (!profile.onboarded) await completeStudent();
      await navigate({ to: "/dashboard", replace: true });
    });
  }

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setValidationError(null);
    try {
      await action();
    } catch (error) {
      toast.error(errMsg(error));
      setValidationError(t("onb.saveError"));
    } finally {
      setBusy(false);
    }
  }

  function toggleValue(values: string[], setValues: (value: string[]) => void, value: string) {
    setValues(
      values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
    );
    setValidationError(null);
  }

  function continueBack() {
    if (step === "name" || step === "role") return;
    if (step === "student-level") setStep("role");
    else if (step === "student-track") setStep("student-level");
    else if (step === "student-complete") {
      setStep(
        c.levels.find((level) => level.id === levelId)?.requires_track
          ? "student-track"
          : "student-level",
      );
    } else if (step === "teacher-school") setStep("role");
    else if (step === "teacher-levels") setStep("teacher-school");
    else if (step === "teacher-tracks") setStep("teacher-levels");
    else if (step === "teacher-phone") {
      setStep(requiredTeacherLevels.length ? "teacher-tracks" : "teacher-levels");
    } else if (step === "teacher-complete") setStep("teacher-phone");
    setValidationError(null);
  }

  const roleCard = (
    selectedRole: OnboardingRole,
    Icon: typeof GraduationCap,
    title: string,
    description: string,
  ) => (
    <button
      type="button"
      onClick={() => {
        if (role && role !== selectedRole) return;
        setRoleChoice(selectedRole);
        setValidationError(null);
      }}
      disabled={!!role && role !== selectedRole}
      aria-pressed={roleChoice === selectedRole}
      className={cn(
        "flex min-h-28 flex-1 items-start gap-4 rounded-xl border-2 bg-card p-5 text-left transition-colors",
        roleChoice === selectedRole
          ? "border-brand bg-brand/5"
          : "border-border hover:border-brand/50",
      )}
    >
      <Icon className="mt-0.5 h-6 w-6 text-deep" />
      <span>
        <span className="block font-semibold text-heading">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      </span>
    </button>
  );

  function formQuestion(title: string, content: ReactNode, onSubmit: () => void) {
    return (
      <form
        className="card-surface mt-6 flex flex-col gap-5 p-5 sm:p-7"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <h2 className="text-xl font-semibold text-heading">{title}</h2>
        {content}
        {validationError && (
          <p className="text-sm text-destructive" role="alert">
            {validationError}
          </p>
        )}
        <StepActions
          onBack={continueBack}
          showBack={step !== "role" && step !== "name"}
          busy={busy}
          continueLabel={t("onb.submit")}
          backLabel={t("onb.back")}
          busyLabel={t("common.loading")}
        />
      </form>
    );
  }

  let content: ReactNode;
  if (step === "role") {
    content = (
      <section className="card-surface mt-6 flex flex-col gap-5 p-5 sm:p-7">
        <h2 className="text-xl font-semibold text-heading">{t("onb.roleQuestion")}</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          {roleCard("student", GraduationCap, t("onb.student"), t("onb.studentD"))}
          {roleCard("teacher", PenSquare, t("onb.teacher"), t("onb.teacherD"))}
        </div>
        {validationError && (
          <p className="text-sm text-destructive" role="alert">
            {validationError}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="button" size="lg" disabled={busy} onClick={() => void chooseRole()}>
            {t("onb.submit")}
          </Button>
        </div>
      </section>
    );
  } else if (step === "name") {
    content = formQuestion(
      t("onb.nameQuestion"),
      <>
        <p className="text-sm text-muted-foreground">{t("onb.nameHint")}</p>
        <Field label={t("auth.fullName")} htmlFor="onboarding-name">
          <Input
            id="onboarding-name"
            autoComplete="name"
            maxLength={120}
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </Field>
      </>,
      saveName,
    );
  } else if (step === "student-level") {
    content = formQuestion(
      t("onb.levelQuestion"),
      <Field label={t("onb.level")} htmlFor="student-level">
        <NativeSelect
          id="student-level"
          required
          value={levelId}
          onChange={(event) => {
            setLevelId(event.target.value);
            setTrackId("");
            setValidationError(null);
          }}
        >
          <option value="">{t("common.select")}</option>
          {c.levels.map((level) => (
            <option key={level.id} value={level.id}>
              {name(level)}
            </option>
          ))}
        </NativeSelect>
      </Field>,
      saveStudentLevel,
    );
  } else if (step === "student-track") {
    content = formQuestion(
      t("onb.studentDepartmentQuestion"),
      <Field label={t("onb.track")} htmlFor="student-track">
        <NativeSelect
          id="student-track"
          required
          value={trackId}
          onChange={(event) => {
            setTrackId(event.target.value);
            setValidationError(null);
          }}
        >
          <option value="">{t("common.select")}</option>
          {studentTracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.code} — {name(track)}
            </option>
          ))}
        </NativeSelect>
      </Field>,
      saveStudentTrack,
    );
  } else if (step === "teacher-school") {
    content = formQuestion(
      t("onb.teacherSchoolQuestion"),
      <Field label={t("onb.school")} htmlFor="teacher-school">
        <Input
          id="teacher-school"
          autoComplete="organization"
          maxLength={200}
          required
          value={school}
          placeholder={t("onb.teacherSchoolPlaceholder")}
          onChange={(event) => setSchool(event.target.value)}
        />
      </Field>,
      saveTeacherSchool,
    );
  } else if (step === "teacher-levels") {
    content = formQuestion(
      t("onb.teacherClassesQuestion"),
      <fieldset className="grid gap-3">
        <legend className="text-sm text-muted-foreground">{t("onb.teacherClassesHint")}</legend>
        {c.levels.map((level) => (
          <label
            key={level.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm font-medium"
          >
            <input
              type="checkbox"
              checked={teacherLevelIds.includes(level.id)}
              onChange={() => toggleValue(teacherLevelIds, setTeacherLevelIds, level.id)}
            />
            {name(level)}
          </label>
        ))}
      </fieldset>,
      saveTeacherLevels,
    );
  } else if (step === "teacher-tracks") {
    content = formQuestion(
      t("onb.teacherDepartmentQuestion"),
      <fieldset className="grid gap-4">
        <legend className="text-sm text-muted-foreground">{t("onb.teacherDepartmentHint")}</legend>
        {requiredTeacherLevels.map((teacherLevelId) => {
          const teacherLevel = c.levels.find((level) => level.id === teacherLevelId);
          const tracks = teacherTracks.filter((track) => track.level_id === teacherLevelId);
          return (
            <div key={teacherLevelId} className="grid gap-2">
              <p className="text-sm font-semibold">{teacherLevel ? name(teacherLevel) : ""}</p>
              {tracks.map((track) => (
                <label
                  key={track.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={teacherTrackIds.includes(track.id)}
                    onChange={() => toggleValue(teacherTrackIds, setTeacherTrackIds, track.id)}
                  />
                  {track.code} — {name(track)}
                </label>
              ))}
            </div>
          );
        })}
      </fieldset>,
      saveTeacherTracks,
    );
  } else if (step === "teacher-phone") {
    content = formQuestion(
      t("onb.phoneQuestion"),
      <>
        <Field label={t("onb.phoneQuestion")} htmlFor="teacher-phone" hint={t("onb.phoneHint")}>
          <Input
            id="teacher-phone"
            type="tel"
            autoComplete="tel"
            required
            maxLength={24}
            value={phone}
            aria-invalid={!!validationError}
            onChange={(event) => {
              setPhone(event.target.value);
              setValidationError(null);
            }}
          />
        </Field>
      </>,
      finishTeacher,
    );
  } else {
    const isTeacherComplete = step === "teacher-complete";
    content = (
      <section className="card-surface mt-6 flex flex-col items-start gap-4 p-5 sm:p-7">
        <h2 className="text-xl font-semibold text-heading">{t("onb.completeTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t(isTeacherComplete ? "onb.teacherComplete" : "onb.studentComplete")}
        </p>
        {validationError && (
          <p className="text-sm text-destructive" role="alert">
            {validationError}
          </p>
        )}
        <div className="flex w-full justify-end">
          {isTeacherComplete ? (
            <Button type="button" size="lg" onClick={() => void navigate({ to: "/teacher" })}>
              {t("onb.goToDashboard")}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              disabled={busy}
              onClick={() => void submitStudentCompletion()}
            >
              {t("onb.goToDashboard")}
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold sm:text-3xl">{t("onb.title")}</h1>
      <div className="mt-5 grid gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("onb.progress")}</span>
          <span>
            {stepIndex + 1} / {flow.length}
          </span>
        </div>
        <Progress value={progressValue} aria-label={t("onb.progress")} />
      </div>
      {content}
    </div>
  );
}

function getFlowSteps(
  role: OnboardingRole | null,
  profile: {
    full_name: string | null;
    level_id: string | null;
    track_id: string | null;
    school: string | null;
    phone: string | null;
  },
  levels: { id: string; requires_track: boolean }[],
  teacherAssignments: { level_id: string; track_id: string | null }[],
): OnboardingStep[] {
  if (!role) return ["role"];
  const steps: OnboardingStep[] = [];
  if (!profile.full_name?.trim()) steps.push("name");
  if (role === "student") {
    if (!profile.level_id) steps.push("student-level");
    else if (
      levels.some((level) => level.id === profile.level_id && level.requires_track) &&
      !profile.track_id
    ) {
      steps.push("student-track");
    }
    return [...steps, "student-complete"];
  }
  if (!profile.school?.trim()) steps.push("teacher-school");
  if (!teacherAssignments.length) steps.push("teacher-levels");
  else if (
    teacherAssignments.some(
      (assignment) =>
        levels.some((level) => level.id === assignment.level_id && level.requires_track) &&
        !assignment.track_id,
    )
  ) {
    steps.push("teacher-tracks");
  }
  if (!isValidInternationalPhone(profile.phone)) steps.push("teacher-phone");
  return [...steps, "teacher-complete"];
}

function StepActions({
  onBack,
  showBack,
  busy,
  busyLabel,
  continueLabel,
  backLabel,
}: {
  onBack: () => void;
  showBack: boolean;
  busy: boolean;
  busyLabel: string;
  continueLabel: string;
  backLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      {showBack ? (
        <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
          {backLabel}
        </Button>
      ) : (
        <span />
      )}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? busyLabel : continueLabel}
      </Button>
    </div>
  );
}
