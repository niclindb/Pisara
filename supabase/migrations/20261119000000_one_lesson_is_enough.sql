-- A topic shows to learners once it has one published lesson (E4). It used to
-- need 3. Same view as before otherwise: a parent of a shown topic is still
-- shown as its heading, and the view runs with the owner's rights.
create or replace view public.visible_topics as
with recursive ready as (
  select distinct l.topic_id as id
  from public.lessons l
  where l.status = 'published'
), shown(id) as (
  select id from ready
  union
  select t.parent_id from public.topics t join shown s on t.id = s.id
  where t.parent_id is not null
)
select
  t.id, t.category_id, t.parent_id, t.position, t.name, t.goal, t.description,
  (select count(*) from public.lessons l
   where l.topic_id = t.id and l.status = 'published')::int as lesson_count,  -- A3
  (t.id in (select id from ready)) as pickable
from public.topics t
where t.id in (select id from shown);
