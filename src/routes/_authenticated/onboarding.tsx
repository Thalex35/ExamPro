import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { GraduationCap, PenSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { catalogQuery } from "@/lib/catalog";
import {
  haitiDepartments,
  isHaitiDepartment,
  isValidSchoolName,
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [levelId, setLevelId] = useState("");
  const [geographicalDepartment, setGeographicalDepartment] = useState("");
  const [trackId, setTrackId] = useState("");
  const [school, setSchool] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
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

    const providerName =
      typeof me.user.user_metadata["full_name"] === "string"
        ? me.user.user_metadata["full_name"]
        : typeof me.user.user_metadata["name"] === "string"
          ? me.user.user_metadata["name"]
          : "";
    const [providerFirstName = "", ...providerLastNameParts] = providerName.trim().split(/\s+/);
    const savedRole: OnboardingRole | null = me.isTeacher
      ? "teacher"
      : me.isStudent
        ? "student"
        : null;
    const savedAssignments = assignments.data ?? [];
    const metadataFirstName =
      typeof me.user.user_metadata["first_name"] === "string"
        ? me.user.user_metadata["first_name"]
        : typeof me.user.user_metadata["given_name"] === "string"
          ? me.user.user_metadata["given_name"]
          : providerFirstName;
    const metadataLastName =
      typeof me.user.user_metadata["last_name"] === "string"
        ? me.user.user_metadata["last_name"]
        : typeof me.user.user_metadata["family_name"] === "string"
          ? me.user.user_metadata["family_name"]
          : providerLastNameParts.join(" ");
    setRole(savedRole);
    setRoleChoice(savedRole);
    setFirstName(me.profile.first_name ?? metadataFirstName);
    setLastName(me.profile.last_name ?? metadataLastName);
    setLevelId(me.profile.level_id ?? "");
    setGeographicalDepartment(me.profile.geographical_department ?? "");
    setTrackId(me.profile.track_id ?? "");
    setSchool(me.profile.school ?? "");
    setSchoolPhone(me.profile.school_phone ?? "");
    setSchoolEmail(me.profile.school_email ?? "");
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
    const first = firstName.trim();
    const last = lastName.trim();
    if (
      !first ||
      !last ||
      first.length > 80 ||
      last.length > 80 ||
      `${first} ${last}`.length > 120
    ) {
      setValidationError(t("onb.nameRequired"));
      return;
    }
    await run(async () => {
      await assertRpc(
        supabase.rpc("save_onboarding_names", { _first_name: first, _last_name: last }),
      );
      await qc.invalidateQueries({ queryKey: ["me"] });
      setStep(
        nextOnboardingStep(
          role,
          { ...profile, first_name: first, last_name: last, full_name: `${first} ${last}` },
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
          {
            ...profile,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`,
          },
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
      if (!isHaitiDepartment(profile.geographical_department)) {
        setStep("student-department");
      } else if (selectedLevel.requires_track) {
        setStep("student-track");
      } else {
        await continueStudentAfterAcademics();
      }
    });
  }

  async function saveStudentDepartment() {
    if (!isHaitiDepartment(geographicalDepartment)) {
      setValidationError(t("onb.geographicalDepartmentRequired"));
      return;
    }
    await run(async () => {
      await assertRpc(
        supabase.rpc("save_student_onboarding_department", {
          _geographical_department: geographicalDepartment,
        }),
      );
      await qc.invalidateQueries({ queryKey: ["me"] });
      if (
        c.levels.find((level) => level.id === levelId)?.requires_track &&
        !c.tracks.some((track) => track.id === trackId && track.level_id === levelId)
      ) {
        setStep("student-track");
      } else {
        await continueStudentAfterAcademics();
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
      await continueStudentAfterAcademics();
    });
  }

  async function saveStudentSchoolInformation() {
    const schoolName = school.trim();
    const emailValue = schoolEmail.trim();
    const phoneValue = schoolPhone.trim();
    if (schoolName.length < 2 || schoolName.length > 200) {
      setValidationError(t("onb.schoolRequired"));
      return;
    }
    if (emailValue && (emailValue.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue))) {
      setValidationError(t("onb.schoolEmailInvalid"));
      return;
    }
    if (phoneValue && (phoneValue.length > 32 || !/^\+?[0-9][0-9 ()-]{6,23}$/.test(phoneValue))) {
      setValidationError(t("onb.schoolPhoneInvalid"));
      return;
    }
    await run(async () => {
      await assertRpc(
        supabase.rpc("save_student_school_information", {
          _name: schoolName,
          _email: emailValue || null,
          _phone: phoneValue || null,
        }),
      );
      await qc.invalidateQueries({ queryKey: ["me"] });
      await completeStudent();
    });
  }

  async function continueStudentAfterAcademics() {
    if (isValidSchoolName(school)) await completeStudent();
    else setStep("student-school");
  }

  async function saveTeacherDepartment() {
    if (!isHaitiDepartment(geographicalDepartment)) {
      setValidationError(t("onb.geographicalDepartmentRequired"));
      return;
    }
    await run(async () => {
      await assertRpc(
        supabase.rpc("save_teacher_onboarding_department", {
          _department: geographicalDepartment,
        }),
      );
      await qc.invalidateQueries({ queryKey: ["me"] });
      setSchool("");
      setSchoolPhone("");
      setSchoolEmail("");
      setStep("teacher-school");
    });
  }

  async function saveTeacherSchool() {
    const value = school.trim();
    const phoneValue = schoolPhone.trim();
    const emailValue = schoolEmail.trim();
    if (value.length < 2 || value.length > 200) {
      setValidationError(t("onb.schoolRequired"));
      return;
    }
    if (emailValue.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setValidationError(t("onb.schoolEmailInvalid"));
      return;
    }
    if (phoneValue.length > 32 || !/^\+?[0-9][0-9 ()-]{6,23}$/.test(phoneValue)) {
      setValidationError(t("onb.schoolPhoneInvalid"));
      return;
    }
    await run(async () => {
      const { data: selectedId, error } = await supabase.rpc("register_onboarding_school", {
        _name: value,
      });
      if (error) throw error;
      await assertRpc(supabase.rpc("save_onboarding_school", { _school_id: selectedId }));
      await assertRpc(
        supabase.rpc("save_teacher_school_contacts", {
          _phone: phoneValue,
          _email: emailValue,
        }),
      );
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
    if (!isValidSchoolName(school)) {
      setStep("student-school");
      setValidationError(t("onb.schoolRequired"));
      return;
    }
    await assertRpc(supabase.rpc("finish_student_onboarding"));
    await qc.invalidateQueries({ queryKey: ["me"] });
    setStep("student-complete");
  }

  async function submitStudentCompletion() {
    await run(async () => {
      if (!profile.onboarded) await completeStudent();
      if (!isValidSchoolName(school)) {
        setStep("student-school");
        setValidationError(t("onb.schoolRequired"));
        return;
      }
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
    else if (step === "student-department") setStep("student-level");
    else if (step === "student-track") setStep("student-department");
    else if (step === "student-school") {
      setStep(
        c.levels.find((level) => level.id === levelId)?.requires_track
          ? "student-track"
          : "student-department",
      );
    } else if (step === "student-complete") {
      setStep("student-school");
    } else if (step === "teacher-department") setStep("role");
    else if (step === "teacher-school") setStep("teacher-department");
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
          showBack={step !== "name"}
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
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" disabled={busy} onClick={() => setStep("name")}>
            {t("onb.back")}
          </Button>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("auth.firstName")} htmlFor="onboarding-first-name">
            <Input
              id="onboarding-first-name"
              autoComplete="given-name"
              maxLength={80}
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </Field>
          <Field label={t("auth.lastName")} htmlFor="onboarding-last-name">
            <Input
              id="onboarding-last-name"
              autoComplete="family-name"
              maxLength={80}
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </Field>
        </div>
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
  } else if (step === "student-department") {
    content = formQuestion(
      t("onb.geographicalDepartmentQuestion"),
      <Field label={t("onb.geographicalDepartment")} htmlFor="student-geographical-department">
        <NativeSelect
          id="student-geographical-department"
          required
          value={geographicalDepartment}
          onChange={(event) => {
            setGeographicalDepartment(event.target.value);
            setValidationError(null);
          }}
        >
          <option value="">{t("common.select")}</option>
          {haitiDepartments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </NativeSelect>
      </Field>,
      saveStudentDepartment,
    );
  } else if (step === "student-track") {
    content = formQuestion(
      t("onb.studentTrackQuestion"),
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
  } else if (step === "student-school") {
    content = formQuestion(
      t("onb.studentSchoolQuestion"),
      <div className="grid gap-4">
        <Field label={t("onb.schoolName")} htmlFor="student-school-name">
          <Input
            id="student-school-name"
            autoComplete="organization"
            maxLength={200}
            required
            value={school}
            placeholder={t("onb.teacherSchoolPlaceholder")}
            onChange={(event) => {
              setSchool(event.target.value);
              setValidationError(null);
            }}
          />
        </Field>
        <Field
          label={t("onb.schoolEmail")}
          htmlFor="student-school-email"
          hint={t("onb.schoolContactOptional")}
        >
          <Input
            id="student-school-email"
            type="email"
            maxLength={254}
            value={schoolEmail}
            onChange={(event) => setSchoolEmail(event.target.value)}
          />
        </Field>
        <Field
          label={t("onb.schoolPhone")}
          htmlFor="student-school-phone"
          hint={t("onb.schoolContactOptional")}
        >
          <Input
            id="student-school-phone"
            type="tel"
            maxLength={32}
            value={schoolPhone}
            onChange={(event) => setSchoolPhone(event.target.value)}
          />
        </Field>
      </div>,
      saveStudentSchoolInformation,
    );
  } else if (step === "teacher-department") {
    content = formQuestion(
      t("onb.teacherGeographicalDepartmentQuestion"),
      <Field label={t("onb.geographicalDepartment")} htmlFor="teacher-geographical-department">
        <NativeSelect
          id="teacher-geographical-department"
          required
          value={geographicalDepartment}
          onChange={(event) => {
            setGeographicalDepartment(event.target.value);
            setSchool("");
            setSchoolPhone("");
            setSchoolEmail("");
            setValidationError(null);
          }}
        >
          <option value="">{t("common.select")}</option>
          {haitiDepartments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </NativeSelect>
      </Field>,
      saveTeacherDepartment,
    );
  } else if (step === "teacher-school") {
    content = formQuestion(
      t("onb.teacherSchoolQuestion"),
      <div className="grid gap-4">
        <Field label={t("onb.schoolName")} htmlFor="teacher-school-name">
          <Input
            id="teacher-school-name"
            autoComplete="organization"
            maxLength={200}
            required
            value={school}
            placeholder={t("onb.teacherSchoolPlaceholder")}
            onChange={(event) => {
              setSchool(event.target.value);
              setValidationError(null);
            }}
          />
        </Field>
        <Field
          label={t("onb.schoolPhone")}
          htmlFor="teacher-school-phone"
          hint={t("onb.schoolContactRequired")}
        >
          <Input
            id="teacher-school-phone"
            type="tel"
            maxLength={32}
            required
            value={schoolPhone}
            onChange={(event) => {
              setSchoolPhone(event.target.value);
              setValidationError(null);
            }}
          />
        </Field>
        <Field
          label={t("onb.schoolEmail")}
          htmlFor="teacher-school-email"
          hint={t("onb.schoolContactRequired")}
        >
          <Input
            id="teacher-school-email"
            type="email"
            maxLength={254}
            required
            value={schoolEmail}
            onChange={(event) => {
              setSchoolEmail(event.target.value);
              setValidationError(null);
            }}
          />
        </Field>
      </div>,
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
    first_name: string | null;
    last_name: string | null;
    level_id: string | null;
    track_id: string | null;
    geographical_department: string | null;
    school: string | null;
    school_id: string | null;
    school_email: string | null;
    school_phone: string | null;
    teacher_school_contacts_confirmed: boolean;
    phone: string | null;
  },
  levels: { id: string; requires_track: boolean }[],
  teacherAssignments: { level_id: string; track_id: string | null }[],
): OnboardingStep[] {
  const steps: OnboardingStep[] = [];
  if (!profile.first_name?.trim() || !profile.last_name?.trim()) steps.push("name");
  if (!role) return [...steps, "role"];
  if (role === "student") {
    if (!profile.level_id) steps.push("student-level");
    else {
      if (!isHaitiDepartment(profile.geographical_department)) {
        steps.push("student-department");
      } else if (
        levels.some((level) => level.id === profile.level_id && level.requires_track) &&
        !profile.track_id
      ) {
        steps.push("student-track");
      }
    }
    if (!isValidSchoolName(profile.school)) steps.push("student-school");
    return [...steps, "student-complete"];
  }
  if (!isHaitiDepartment(profile.geographical_department)) steps.push("teacher-department");
  if (
    !profile.school_id ||
    !profile.teacher_school_contacts_confirmed ||
    !profile.school_email?.trim() ||
    !profile.school_phone?.trim()
  ) {
    steps.push("teacher-school");
  }
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
