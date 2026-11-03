-- Pisara initial schema. See docs/design.md section 4 (data model) and section 9 (security).
--
-- Who can do what:
--   * Everyone signed in can read published content (and authors can read everything).
--   * Learners can read only their own learner data. Writes go through the Next.js
--     server, which uses the user's session, so the policies below are the safety net.
--   * Authors (profiles.role = 'author') can write content.
--   * The daily delivery job uses the service role key, which bypasses these rules.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('learner', 'author');
create type public.lesson_status as enum ('draft', 'published', 'unpublished');
create type public.delivery_kind as enum ('daily', 'extra');
create type public.answer_context as enum ('lesson', 'review', 'weekly');

-- ---------------------------------------------------------------------------
-- Content (written by authors)
-- ---------------------------------------------------------------------------

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

-- Topics form a tree. A top-level topic has a category and no parent; a
-- sub-topic has a parent and no category of its own (it uses its parent's).
-- The parent is also the sub-topic's prerequisite (A3a).
create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete restrict,
  parent_id   uuid references public.topics (id) on delete restrict,
  position    int  not null default 0,
  name        text not null check (length(trim(name)) > 0),
  goal        text not null default '',
  description text not null default '',
  outline     text not null default '',
  created_at  timestamptz not null default now(),
  constraint topics_category_xor_parent check ((category_id is null) <> (parent_id is null)),
  constraint topics_not_own_parent check (parent_id <> id)
);
create index topics_category_id_idx on public.topics (category_id);
create index topics_parent_id_idx on public.topics (parent_id);

-- Stop a topic from being moved under one of its own descendants.
create function public.topics_prevent_cycle() returns trigger
language plpgsql as $$
begin
  if new.parent_id is not null and exists (
    with recursive ancestors(id) as (
      select new.parent_id
      union
      select t.parent_id from public.topics t join ancestors a on t.id = a.id
      where t.parent_id is not null
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'A topic cannot be placed under one of its own sub-topics';
  end if;
  return new;
end $$;

create trigger topics_prevent_cycle
  before insert or update of parent_id on public.topics
  for each row execute function public.topics_prevent_cycle();

create table public.lessons (
  id              uuid primary key default gen_random_uuid(),
  topic_id        uuid not null references public.topics (id) on delete restrict,
  position        int  not null,  -- order in the path; gaps allowed
  level           int  not null default 1 check (level >= 1),
  title           text not null check (length(trim(title)) > 0),
  body            text not null default '',  -- Markdown
  reading_minutes int  not null default 1 check (reading_minutes >= 1),
  status          public.lesson_status not null default 'draft',
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (topic_id, position)
);
create index lessons_topic_status_idx on public.lessons (topic_id, status, position);

create table public.questions (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  position      int  not null default 0,
  prompt        text not null check (length(trim(prompt)) > 0),
  options       text[] not null check (cardinality(options) between 2 and 4),
  correct_index int  not null,
  explanation   text not null default '',
  constraint questions_correct_index_in_range
    check (correct_index >= 0 and correct_index < cardinality(options))
);
create index questions_lesson_id_idx on public.questions (lesson_id);

-- Learner-visible topics: at least 3 published lessons (E4), or a parent of
-- such a topic, so the tree has its headings. This is also what signed-out
-- visitors browse, so it runs with the view owner's rights (it has to count
-- lessons they can't read) and leaves out the author-only outline.
create view public.visible_topics as
with recursive ready as (
  select t.id
  from public.topics t
  join public.lessons l on l.topic_id = t.id and l.status = 'published'
  group by t.id
  having count(*) >= 3
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

-- Each topic's first published lesson is a free preview that anyone can read,
-- quiz included, before signing up.
create function public.is_preview_lesson(lesson_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
    where l.id = lesson_id and l.status = 'published'
      and l.position = (select min(l2.position) from public.lessons l2
                        where l2.topic_id = l.topic_id and l2.status = 'published')
  );
$$;

-- ---------------------------------------------------------------------------
-- Learner data
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  email                    text not null unique,
  display_name             text check (display_name is null or length(trim(display_name)) between 1 and 50),  -- optional, e.g. for "Good morning, Nick"
  time_zone                text not null default 'UTC',  -- IANA name (A5)
  weekly_recap_day         int  not null default 0 check (weekly_recap_day between 0 and 6),  -- 0 = Sunday
  emails_enabled           boolean not null default true,
  paused_until             date,
  waiting_reminders_sent   int  not null default 0 check (waiting_reminders_sent between 0 and 2),  -- B6
  waiting_reminder_sent_on date,
  last_active_at           timestamptz,
  role                     public.user_role not null default 'learner',
  created_at               timestamptz not null default now()
);

create table public.user_topics (
  user_id           uuid not null references public.profiles (id) on delete cascade,
  topic_id          uuid not null references public.topics (id) on delete cascade,
  interest          int  not null default 3 check (interest between 0 and 5),  -- 0 = Off; else the weight
  last_delivered_at timestamptz,
  created_at        timestamptz not null default now(),
  primary key (user_id, topic_id)
);

-- The inbox. Unread = read_at is null.
create table public.deliveries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  lesson_id         uuid not null references public.lessons (id) on delete restrict,
  kind              public.delivery_kind not null default 'daily',
  local_date        date not null,
  delivered_at      timestamptz not null default now(),
  read_at           timestamptz,
  quiz_completed_at timestamptz,
  unique (user_id, lesson_id)
);
-- One daily lesson per learner per local date, so a repeated job run is harmless.
create unique index deliveries_one_daily_per_day
  on public.deliveries (user_id, local_date) where kind = 'daily';
create index deliveries_unread_idx on public.deliveries (user_id) where read_at is null;

create table public.answers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  question_id  uuid not null references public.questions (id) on delete cascade,
  context      public.answer_context not null,
  chosen_index int  not null,
  correct      boolean not null,
  answered_at  timestamptz not null default now()
);
create index answers_user_idx on public.answers (user_id, answered_at);

-- Only missed questions get a review item (C5, C6).
create table public.review_items (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  question_id  uuid not null references public.questions (id) on delete cascade,
  step         int  not null default 0 check (step between 0 and 4),
  due_on       date not null,
  last_correct boolean not null default false,
  primary key (user_id, question_id)
);
create index review_items_due_idx on public.review_items (user_id, due_on);

create table public.weekly_recaps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  week_start   date not null,
  question_ids uuid[] not null,
  completed_at timestamptz,
  unique (user_id, week_start)
);

create table public.milestones (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null,  -- e.g. 'lessons_10', 'level_up:<topic id>:2', 'topic_goal:<topic id>'
  achieved_at timestamptz not null default now(),
  shown_at    timestamptz,
  primary key (user_id, kind)
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Create a profile when someone signs in for the first time (A1).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Learners can't make themselves authors, or change their own email or id.
-- Only the service role (or the database owner, e.g. the SQL editor) can.
create function public.profiles_protect_columns() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.role is distinct from old.role
          or new.email is distinct from old.email
          or new.id is distinct from old.id) then
    raise exception 'Not allowed to change role, email or id';
  end if;
  return new;
end $$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.profiles_protect_columns();

-- Keep published_at and updated_at in step with lesson edits.
create function public.lessons_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
  end if;
  return new;
end $$;

create trigger lessons_touch
  before insert or update on public.lessons
  for each row execute function public.lessons_touch();

-- ---------------------------------------------------------------------------
-- Access rules (row-level security)
-- ---------------------------------------------------------------------------

create function public.is_author() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'author'
  );
$$;

alter table public.categories    enable row level security;
alter table public.topics        enable row level security;
alter table public.lessons       enable row level security;
alter table public.questions     enable row level security;
alter table public.profiles      enable row level security;
alter table public.user_topics   enable row level security;
alter table public.deliveries    enable row level security;
alter table public.answers       enable row level security;
alter table public.review_items  enable row level security;
alter table public.weekly_recaps enable row level security;
alter table public.milestones    enable row level security;

-- Content: everyone reads categories and visible_topics, and signed-out
-- visitors can read one preview lesson per topic. Signed-in users read
-- published content; authors read drafts too and write.
create policy "everyone reads categories" on public.categories
  for select to anon, authenticated using (true);
create policy "authors write categories" on public.categories
  for all to authenticated using (public.is_author()) with check (public.is_author());

create policy "signed-in users read topics" on public.topics
  for select to authenticated using (true);
create policy "authors write topics" on public.topics
  for all to authenticated using (public.is_author()) with check (public.is_author());

-- Learners see published lessons, plus unpublished ones already in their inbox (E7).
create policy "read published or delivered lessons" on public.lessons
  for select to authenticated using (
    status = 'published'
    or public.is_author()
    or exists (select 1 from public.deliveries d
               where d.lesson_id = lessons.id and d.user_id = auth.uid())
  );
create policy "visitors read preview lessons" on public.lessons
  for select to anon using (public.is_preview_lesson(id));
create policy "authors write lessons" on public.lessons
  for all to authenticated using (public.is_author()) with check (public.is_author());

-- Questions follow their lesson's visibility. Note: correct_index is readable;
-- the lesson page should still grade on the server so answers are recorded.
create policy "read questions of readable lessons" on public.questions
  for select to anon, authenticated using (
    exists (select 1 from public.lessons l where l.id = questions.lesson_id)
  );
create policy "authors write questions" on public.questions
  for all to authenticated using (public.is_author()) with check (public.is_author());

-- Learner data: own rows only.
create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Deleting an account (D9) is done by the server with the service role, by
-- deleting the auth user; everything else cascades from there.

create policy "own topics" on public.user_topics
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Deliveries are created by the job (service role). Learners can read theirs
-- and mark them read or quiz-completed.
create policy "read own deliveries" on public.deliveries
  for select to authenticated using (user_id = auth.uid());
create policy "update own deliveries" on public.deliveries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read own answers" on public.answers
  for select to authenticated using (user_id = auth.uid());
create policy "insert own answers" on public.answers
  for insert to authenticated with check (user_id = auth.uid());

create policy "own review items" on public.review_items
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read own recaps" on public.weekly_recaps
  for select to authenticated using (user_id = auth.uid());
create policy "update own recaps" on public.weekly_recaps
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read own milestones" on public.milestones
  for select to authenticated using (user_id = auth.uid());
create policy "insert own milestones" on public.milestones
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own milestones" on public.milestones
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.visible_topics to anon, authenticated;
