create table private.demo_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  sort_order smallint not null unique,
  question_fr text not null,
  question_ht text not null,
  options_fr text[] not null check (cardinality(options_fr) = 4),
  options_ht text[] not null check (cardinality(options_ht) = 4),
  correct_index smallint not null check (correct_index between 0 and 3),
  explanation_fr text not null,
  explanation_ht text not null,
  active boolean not null default true
);

revoke all on table private.demo_quiz_questions from public, anon, authenticated;
grant all on table private.demo_quiz_questions to service_role;

insert into private.demo_quiz_questions (
  sort_order, question_fr, question_ht, options_fr, options_ht, correct_index,
  explanation_fr, explanation_ht
) values
(
  1,
  'Face à un problème que vous ne comprenez pas, quelle est la meilleure première étape ?',
  'Lè w rankontre yon pwoblèm ou pa konprann, ki premye etap ki pi bon an?',
  array['Relire la consigne et repérer ce qui est demandé', 'Choisir une réponse au hasard', 'Copier la réponse d’un camarade', 'Sauter directement à la conclusion'],
  array['Reli enstriksyon an epi chèche sa yo mande a', 'Chwazi yon repons o aza', 'Kopye repons yon kamarad', 'Ale dirèkteman nan konklizyon an'],
  0,
  'Comprendre la consigne permet d’identifier les informations utiles et la tâche à accomplir.',
  'Lè w konprann enstriksyon an, sa ede w idantifye enfòmasyon ki itil ak travay pou fè a.'
),
(
  2,
  'Quelle source est la plus fiable pour vérifier une information scolaire ?',
  'Ki sous ki pi fyab pou verifye yon enfòmasyon lekòl?',
  array['Un message anonyme sur un réseau social', 'Une rumeur répétée par plusieurs personnes', 'Un manuel scolaire ou un enseignant qualifié', 'Un titre sans source ni auteur'],
  array['Yon mesaj anonim sou rezo sosyal', 'Yon rimè plizyè moun ap repete', 'Yon liv lekòl oswa yon pwofesè ki kalifye', 'Yon tit san sous ni otè'],
  2,
  'Les ressources scolaires fiables indiquent des références ou sont validées par des professionnels de l’enseignement.',
  'Bon resous lekòl yo bay referans oswa pwofesyonèl nan ansèyman verifye yo.'
),
(
  3,
  'Si une question demande de justifier votre réponse, que devez-vous faire ?',
  'Si yon kesyon mande w jistifye repons ou, kisa ou dwe fè?',
  array['Écrire seulement « parce que c’est vrai »', 'Expliquer le raisonnement avec des faits ou des étapes vérifiables', 'Ajouter des détails sans rapport', 'Laisser la justification vide'],
  array['Ekri sèlman « paske se vre »', 'Eksplike rezònman an avèk reyalite oswa etap moun ka verifye', 'Ajoute detay ki pa gen rapò', 'Kite jistifikasyon an vid'],
  1,
  'Une justification relie la conclusion à des éléments précis, des règles ou des étapes logiques.',
  'Yon jistifikasyon konekte konklizyon an ak eleman presi, règ oswa etap ki lojik.'
),
(
  4,
  'Quelle méthode aide le mieux à vérifier ce que vous avez retenu ?',
  'Ki metòd ki pi byen ede w verifye sa ou sonje?',
  array['Relire sans interruption sans se poser de question', 'Surligner toutes les phrases', 'Remettre la révision à la veille de l’examen', 'Fermer le cours et essayer de restituer les idées de mémoire'],
  array['Relire san rete san poze tèt ou kesyon', 'Souliye tout fraz yo', 'Tann lavèy egzamen an pou revize', 'Fèmen kou a epi eseye sonje lide yo san gade'],
  3,
  'Le rappel actif oblige à retrouver l’information en mémoire et révèle ce qui reste à travailler.',
  'Lè w sonje enfòmasyon an san gade, sa montre sa ou deja metrize ak sa ou dwe travay ankò.'
),
(
  5,
  'Votre résultat semble impossible ou très inattendu. Que devriez-vous faire ?',
  'Repons ou jwenn lan parèt enposib oswa li siprann ou anpil. Kisa ou ta dwe fè?',
  array['Effacer le résultat sans vérifier', 'Le garder parce que tout calcul est forcément juste', 'Vérifier les étapes, les données et les unités utilisées', 'Changer une donnée au hasard'],
  array['Efase rezilta a san verifye', 'Kenbe l paske tout kalkil toujou kòrèk', 'Verifye etap yo, done yo ak inite ou itilize yo', 'Chanje yon done o aza'],
  2,
  'Revoir les données, le raisonnement et les unités aide à repérer une erreur de calcul ou d’interprétation.',
  'Lè w verifye done yo, rezònman an ak inite yo, sa ede w jwenn erè nan kalkil oswa nan entèpretasyon.'
),
(
  6,
  'Laquelle de ces phrases est un fait vérifiable ?',
  'Kilès nan fraz sa yo ki se yon reyalite moun ka verifye?',
  array['Cette matière est la plus belle', 'La séance commence à 8 h, selon l’horaire affiché', 'Ce cours est sûrement le plus difficile', 'Tout le monde préfère cette méthode'],
  array['Matyè sa a se pi bèl la', 'Sesyon an kòmanse a 8è, dapre orè ki afiche a', 'Se sèten kou sa a pi difisil la', 'Tout moun prefere metòd sa a'],
  1,
  'Un fait peut être contrôlé à l’aide d’une preuve ou d’une source, contrairement à un jugement personnel.',
  'Moun ka verifye yon reyalite avèk prèv oswa yon sous, kontrèman ak yon opinyon pèsonèl.'
),
(
  7,
  'Deux méthodes valides donnent la même réponse. Comment choisir ?',
  'De metòd ki kòrèk bay menm repons lan. Kijan pou w chwazi?',
  array['Choisir celle qui semble la plus compliquée', 'Mélanger les deux sans vérifier', 'Ne pas montrer son raisonnement', 'Choisir une méthode correcte et efficace, puis pouvoir l’expliquer'],
  array['Chwazi sa ki sanble pi konplike a', 'Melanje toude san verifye', 'Pa montre rezònman an', 'Chwazi yon metòd ki kòrèk e efikas, epi kapab esplike l'],
  3,
  'Une méthode fiable doit être correcte, compréhensible et adaptée au problème.',
  'Yon bon metòd dwe kòrèk, fasil pou konprann epi adapte ak pwoblèm nan.'
),
(
  8,
  'Comment organiser une révision sur plusieurs jours ?',
  'Kijan pou òganize revizyon pandan plizyè jou?',
  array['Tout apprendre en une seule longue séance', 'Répartir les séances et revenir plusieurs fois sur les notions', 'Réviser uniquement les sujets déjà maîtrisés', 'Attendre de ne plus avoir de temps'],
  array['Aprann tout bagay nan yon sèl sesyon ki long', 'Separe sesyon yo epi retounen sou chak sijè plizyè fwa', 'Revize sèlman sijè ou deja metrize yo', 'Tann jiskaske pa rete tan'],
  1,
  'Des séances espacées facilitent la mémorisation et laissent le temps de repérer les difficultés.',
  'Sesyon ki separe yo ede memwa epi yo ba w tan pou wè sa ki difisil.'
),
(
  9,
  'Avant d’interpréter un tableau, que faut-il examiner en premier ?',
  'Anvan w entèprete yon tablo, kisa pou w gade an premye?',
  array['Uniquement la dernière ligne', 'La couleur du fond', 'Le titre, les en-têtes et les unités', 'Une valeur choisie au hasard'],
  array['Dènye liy lan sèlman', 'Koulè fon an', 'Tit la, tit kolòn yo ak inite yo', 'Yon valè yo chwazi o aza'],
  2,
  'Le titre, les en-têtes et les unités précisent ce que représentent les données.',
  'Tit la, tit kolòn yo ak inite yo esplike sa done yo reprezante.'
),
(
  10,
  'Après une erreur dans un exercice, quelle est la meilleure réaction ?',
  'Apre w fè yon erè nan yon egzèsis, ki pi bon reyaksyon an?',
  array['Mémoriser seulement la bonne lettre', 'Abandonner toute la matière', 'Cacher l’erreur sans la revoir', 'Comprendre l’erreur, corriger la méthode et réessayer'],
  array['Sonje bon lèt la sèlman', 'Abandone tout matyè a', 'Kache erè a san w pa revize l', 'Konprann erè a, korije metòd la epi eseye ankò'],
  3,
  'Analyser une erreur transforme la correction en apprentissage et aide à éviter de la répéter.',
  'Lè w analize yon erè, koreksyon an vin tounen aprantisaj epi sa ede w pa repete l.'
);

create or replace function private.validate_demo_quiz_scope(_subject_id uuid, _chapter_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  student_level uuid;
  student_track uuid;
  track_required boolean;
begin
  if auth.uid() is null or not private.is_active_user() or not private.has_role('student') then
    raise exception 'QUIZ_STUDENT_REQUIRED';
  end if;

  select p.level_id, p.track_id into student_level, student_track
  from public.profiles p
  where p.id = auth.uid() and p.onboarded and p.is_active;
  if not found or student_level is null then
    raise exception 'QUIZ_PROFILE_REQUIRED';
  end if;

  select l.requires_track into track_required
  from public.levels l where l.id = student_level;

  if not exists (
    select 1 from public.level_subjects ls
    where ls.level_id = student_level and ls.subject_id = _subject_id
  ) then
    raise exception 'QUIZ_SCOPE_UNAVAILABLE';
  end if;
  if track_required and not exists (
    select 1 from public.tracks t
    join public.track_subjects ts on ts.track_id = t.id
    where t.id = student_track and t.level_id = student_level and ts.subject_id = _subject_id
  ) then
    raise exception 'QUIZ_SCOPE_UNAVAILABLE';
  end if;

  if _chapter_id is null then
    if exists (
      select 1 from public.chapters c
      where c.subject_id = _subject_id and c.level_id = student_level
    ) then
      raise exception 'QUIZ_CHAPTER_REQUIRED';
    end if;
  elsif not exists (
    select 1 from public.chapters c
    where c.id = _chapter_id and c.subject_id = _subject_id and c.level_id = student_level
  ) then
    raise exception 'QUIZ_SCOPE_UNAVAILABLE';
  end if;
end
$$;

revoke all on function private.validate_demo_quiz_scope(uuid, uuid) from public, anon, authenticated;

create or replace function public.get_demo_quiz(_subject_id uuid, _chapter_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  quiz_questions jsonb;
begin
  perform private.validate_demo_quiz_scope(_subject_id, _chapter_id);
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'question_fr', q.question_fr,
        'question_ht', q.question_ht,
        'options_fr', to_jsonb(q.options_fr),
        'options_ht', to_jsonb(q.options_ht)
      ) order by q.sort_order
    ),
    '[]'::jsonb
  )
  into quiz_questions
  from private.demo_quiz_questions q
  where q.active;

  if jsonb_array_length(quiz_questions) <> 10 then
    raise exception 'QUIZ_NOT_AVAILABLE';
  end if;
  return jsonb_build_object('questions', quiz_questions);
end
$$;

revoke all on function public.get_demo_quiz(uuid, uuid) from public, anon;
grant execute on function public.get_demo_quiz(uuid, uuid) to authenticated;

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
  return jsonb_build_object(
    'score', round(correct_count::numeric * 100 / total)::integer,
    'correct_count', correct_count,
    'total', total,
    'results', result_items
  );
end
$$;

revoke all on function public.submit_demo_quiz(uuid, uuid, jsonb) from public, anon;
grant execute on function public.submit_demo_quiz(uuid, uuid, jsonb) to authenticated;
