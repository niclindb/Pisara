-- Lesson levels become three named stages: 1 Beginner, 2 Intermediate,
-- 3 Advanced (decided Nov 5, 2026), replacing open-ended numbers. A learner's
-- standing in a topic uses the same words, so "new level" milestones can fire
-- at most twice per topic. Anything above 3 becomes Advanced.

update public.lessons set level = 3 where level > 3;

alter table public.lessons drop constraint lessons_level_check;
alter table public.lessons add constraint lessons_level_check check (level between 1 and 3);
comment on column public.lessons.level is '1 Beginner, 2 Intermediate, 3 Advanced (E6)';
