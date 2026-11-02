drop trigger if exists require_verified_teacher_school_before_completion on public.profiles;
drop function if exists private.require_verified_teacher_school();

alter policy "Teacher subjects delete" on public.teacher_subjects
  using (
    (teacher_id = auth.uid() and private.is_onboarded() and private.is_teacher_verified())
    or private.has_role('admin')
  );

alter policy "Courses insert" on public.courses
  with check (
    author_id = auth.uid()
    and private.has_role('teacher')
    and private.is_onboarded()
    and private.is_teacher_verified()
  );

alter policy "Courses update" on public.courses
  using (
    (author_id = auth.uid() and private.is_onboarded() and private.is_teacher_verified())
    or private.has_role('admin')
  )
  with check (
    (author_id = auth.uid() and private.is_onboarded() and private.is_teacher_verified())
    or private.has_role('admin')
  );

alter policy "Courses delete" on public.courses
  using (
    (author_id = auth.uid() and private.is_onboarded() and private.is_teacher_verified())
    or private.has_role('admin')
  );

alter policy "Exams insert" on public.exams
  with check (
    author_id = auth.uid()
    and private.has_role('teacher')
    and private.is_onboarded()
    and private.is_teacher_verified()
    and file_path like auth.uid()::text || '/%'
  );

alter policy "Exams update" on public.exams
  using (
    (author_id = auth.uid() and private.is_onboarded() and private.is_teacher_verified())
    or private.has_role('admin')
  )
  with check (
    (author_id = auth.uid() and private.is_onboarded() and private.is_teacher_verified())
    or private.has_role('admin')
  );

alter policy "Exams delete" on public.exams
  using (
    (author_id = auth.uid() and private.is_onboarded() and private.is_teacher_verified())
    or private.has_role('admin')
  );

alter policy "Exam files delete" on storage.objects
  using (
    bucket_id = 'exams'
    and (
      private.has_role('admin')
      or (
        (storage.foldername(name))[1] = auth.uid()::text
        and private.is_onboarded()
        and private.is_teacher_verified()
      )
    )
  );
