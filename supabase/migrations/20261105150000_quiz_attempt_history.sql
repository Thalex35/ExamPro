create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  chapter_id uuid references public.chapters(id) on delete set null,
  score smallint not null check (score between 0 and 100),
  correct_count smallint not null check (correct_count between 0 and 10),
  total_questions smallint not null default 10 check (total_questions = 10),
  results jsonb not null check (
    jsonb_typeof(results) = 'object'
    and coalesce(
      jsonb_typeof(results -> 'results') = 'array'
      and jsonb_array_length(results -> 'results') = 10,
      false
    )
  ),
  created_at timestamptz not null default now()
);

create index quiz_attempts_student_created_idx
  on public.quiz_attempts (student_id, created_at desc);
create index quiz_attempts_student_scope_idx
  on public.quiz_attempts (student_id, subject_id, chapter_id, created_at desc);

alter table public.quiz_attempts enable row level security;
revoke all on public.quiz_attempts from public, anon, authenticated;
grant select on public.quiz_attempts to authenticated;
grant all on public.quiz_attempts to service_role;

create policy "Students read their own quiz attempts"
  on public.quiz_attempts for select to authenticated
  using (
    student_id = auth.uid()
    and private.is_active_user()
    and private.has_role('student')
  );

create or replace function private.notify_quiz_attempt_result()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.insert_notification(
    new.student_id,
    'quiz_result',
    'Résultat du quiz disponible',
    'Rezilta quiz la disponib',
    'Vous avez obtenu ' || new.score::text || '% (' || new.correct_count::text || '/' || new.total_questions::text || ').',
    'Ou jwenn ' || new.score::text || '% (' || new.correct_count::text || '/' || new.total_questions::text || ').',
    '/progress',
    'quiz-attempt-' || new.id::text,
    'quiz_attempt',
    new.id
  );
  return new;
end
$$;

revoke all on function private.notify_quiz_attempt_result() from public, anon, authenticated;
create trigger notify_quiz_attempt_result
after insert on public.quiz_attempts
for each row execute function private.notify_quiz_attempt_result();

create or replace function public.submit_demo_quiz(
  _subject_id uuid,
  _chapter_id uuid,
  _answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer jsonb;
  question record;
  selected_index integer;
  question_id uuid;
  correct_count integer := 0;
  total integer := 0;
  result_items jsonb := '[]'::jsonb;
  result_payload jsonb;
  attempt_id uuid;
  unique_answer_count integer;
begin
  perform private.validate_demo_quiz_scope(_subject_id, _chapter_id);
  if jsonb_typeof(_answers) <> 'array' or jsonb_array_length(_answers) <> 10 then
    raise exception 'QUIZ_ANSWER_COUNT_INVALID';
  end if;

  select count(distinct item.value ->> 'question_id')
  into unique_answer_count
  from jsonb_array_elements(_answers) as item(value);
  if unique_answer_count <> 10 then
    raise exception 'QUIZ_ANSWER_COUNT_INVALID';
  end if;

  for answer in select item.value from jsonb_array_elements(_answers) as item(value)
  loop
    if coalesce(answer ->> 'question_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(answer ->> 'selected_index', '') !~ '^[0-3]$' then
      raise exception 'QUIZ_ANSWER_INVALID';
    end if;

    question_id := (answer ->> 'question_id')::uuid;
    selected_index := (answer ->> 'selected_index')::integer;
    select q.* into question
    from private.demo_quiz_questions q
    where q.id = question_id and q.active;
    if not found then
      raise exception 'QUIZ_ANSWER_INVALID';
    end if;

    total := total + 1;
    if selected_index = question.correct_index then
      correct_count := correct_count + 1;
    end if;
    result_items := result_items || jsonb_build_array(
      jsonb_build_object(
        'id', question.id,
        'question_fr', question.question_fr,
        'question_ht', question.question_ht,
        'options_fr', to_jsonb(question.options_fr),
        'options_ht', to_jsonb(question.options_ht),
        'selected_index', selected_index,
        'correct_index', question.correct_index,
        'is_correct', selected_index = question.correct_index,
        'explanation_fr', question.explanation_fr,
        'explanation_ht', question.explanation_ht
      )
    );
  end loop;

  if total <> 10 then
    raise exception 'QUIZ_ANSWER_COUNT_INVALID';
  end if;

  result_payload := jsonb_build_object(
    'score', round(correct_count::numeric * 100 / total)::integer,
    'correct_count', correct_count,
    'total', total,
    'results', result_items
  );
  insert into public.quiz_attempts (
    student_id, subject_id, chapter_id, score, correct_count, total_questions, results
  )
  values (
    auth.uid(), _subject_id, _chapter_id,
    (result_payload ->> 'score')::smallint,
    correct_count,
    total,
    result_payload
  )
  returning id into attempt_id;

  return result_payload || jsonb_build_object('attempt_id', attempt_id);
end
$$;

revoke all on function public.submit_demo_quiz(uuid, uuid, jsonb) from public, anon;
grant execute on function public.submit_demo_quiz(uuid, uuid, jsonb) to authenticated;
