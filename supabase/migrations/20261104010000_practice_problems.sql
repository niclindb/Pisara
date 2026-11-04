-- Optional practice problems at the end of a lesson (decided Nov 4, 2026).
-- Each has a prompt and a worked solution the learner can reveal. They aren't
-- graded or recorded, and they never enter review. A lesson can have any
-- number of them, including none, just as it can have no quiz questions.

create table public.practice_problems (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  position   int  not null default 0,
  prompt     text not null check (length(trim(prompt)) > 0),   -- Markdown
  solution   text not null check (length(trim(solution)) > 0), -- Markdown, hidden until revealed
  created_at timestamptz not null default now()
);
create index practice_problems_lesson_id_idx on public.practice_problems (lesson_id, position);

alter table public.practice_problems enable row level security;

-- Same visibility as quiz questions: whoever can read the lesson can read its
-- problems (authors, learners it was delivered to, and visitors for previews).
create policy "read problems of readable lessons" on public.practice_problems
  for select to anon, authenticated using (
    exists (select 1 from public.lessons l where l.id = practice_problems.lesson_id)
  );
create policy "authors write problems" on public.practice_problems
  for all to authenticated using (public.is_author()) with check (public.is_author());
