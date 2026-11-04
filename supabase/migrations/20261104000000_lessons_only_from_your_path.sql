-- Learners can't open lessons ahead of their path (decided Nov 4, 2026).
-- A signed-in learner reads only lessons that were delivered to them, plus the
-- free preview lesson of each topic. Authors still read everything. Topic
-- lesson counts keep working, because visible_topics counts with the view
-- owner's rights.

drop policy "read published or delivered lessons" on public.lessons;

create policy "read delivered or preview lessons" on public.lessons
  for select to authenticated using (
    public.is_author()
    or public.is_preview_lesson(id)
    or exists (select 1 from public.deliveries d
               where d.lesson_id = lessons.id and d.user_id = auth.uid())
  );
