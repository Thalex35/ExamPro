alter policy "Teacher subjects insert" on public.teacher_subjects
  with check (
    teacher_id = auth.uid()
    and private.has_role('teacher')
    and private.is_onboarded()
    and private.is_teacher_verified()
  );
