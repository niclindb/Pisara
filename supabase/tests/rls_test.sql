-- Checks the access rules. Run after stub_supabase.sql and the migrations.
-- Every check raises an exception on failure; success prints "all checks passed".
\set ON_ERROR_STOP on
grant usage on schema public to authenticated, service_role;
grant usage on schema public to anon;
grant all on all tables in schema public to anon, authenticated, service_role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'author@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'learner@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'other@example.com');
update public.profiles set role = 'author' where email = 'author@example.com';

insert into public.categories (id, name) values ('10000000-0000-0000-0000-000000000001', 'Science');
insert into public.topics (id, category_id, name) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Astronomy');
insert into public.topics (id, parent_id, name) values ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Stars');
insert into public.lessons (id, topic_id, position, title, status) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 1, 'L1', 'published'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 2, 'L2', 'published'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 3, 'L3', 'published'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 4, 'Draft', 'draft'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 1, 'Old', 'unpublished');
insert into public.questions (lesson_id, prompt, options, correct_index) values
  ('30000000-0000-0000-0000-000000000004', 'Q?', array['a','b'], 0);
insert into public.questions (lesson_id, prompt, options, correct_index) values
  ('30000000-0000-0000-0000-000000000001', 'Preview Q?', array['a','b'], 1);
insert into public.deliveries (user_id, lesson_id, local_date) values
  ('00000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000005', '2026-11-03'),
  ('00000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-000000000001', '2026-11-03');

do $$
declare n int;
begin
  -- Profiles were created by the trigger.
  select count(*) into n from public.profiles; if n <> 3 then raise exception 'profiles: %', n; end if;
  -- published_at set on publish.
  select count(*) into n from public.lessons where status = 'published' and published_at is null;
  if n <> 0 then raise exception 'published_at missing'; end if;
  -- Topic cycle is rejected.
  begin
    update public.topics set parent_id = '20000000-0000-0000-0000-000000000002', category_id = null
      where id = '20000000-0000-0000-0000-000000000001';
    raise exception 'cycle allowed';
  exception when raise_exception then
    if sqlerrm = 'cycle allowed' then raise; end if;
  end;
  -- Second daily delivery on the same date is rejected.
  begin
    insert into public.deliveries (user_id, lesson_id, local_date) values
      ('00000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000001', '2026-11-03');
    raise exception 'two daily deliveries allowed';
  exception when unique_violation then null;
  end;
  -- Visible topics: Stars (3 published) is pickable; Astronomy is shown as its heading only.
  select count(*) into n from public.visible_topics where pickable; if n <> 1 then raise exception 'pickable: %', n; end if;
  select count(*) into n from public.visible_topics; if n <> 2 then raise exception 'visible: %', n; end if;
end $$;

-- As a signed-out visitor.
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$
declare n int;
begin
  select count(*) into n from public.categories; if n <> 1 then raise exception 'visitor sees % categories', n; end if;
  select count(*) into n from public.visible_topics; if n <> 2 then raise exception 'visitor sees % topics', n; end if;
  select lesson_count into n from public.visible_topics where name = 'Stars';
  if n <> 3 then raise exception 'lesson_count %', n; end if;
  -- Only the first published lesson of each topic.
  select count(*) into n from public.lessons; if n <> 1 then raise exception 'visitor sees % lessons', n; end if;
  select count(*) into n from public.lessons where title = 'L1'; if n <> 1 then raise exception 'preview is not L1'; end if;
  select count(*) into n from public.questions; if n <> 1 then raise exception 'visitor sees % questions', n; end if;
  select count(*) into n from public.topics; if n <> 0 then raise exception 'visitor reads topics table'; end if;
  select count(*) into n from public.profiles; if n <> 0 then raise exception 'visitor sees profiles'; end if;
  select count(*) into n from public.deliveries; if n <> 0 then raise exception 'visitor sees deliveries'; end if;
  begin
    insert into public.categories (name) values ('Hacked');
    raise exception 'visitor wrote content';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- As the learner.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
declare n int;
begin
  select count(*) into n from public.profiles; if n <> 1 then raise exception 'learner sees % profiles', n; end if;
  -- 3 published + the unpublished one in their inbox; not the draft.
  select count(*) into n from public.lessons; if n <> 4 then raise exception 'learner sees % lessons', n; end if;
  select count(*) into n from public.questions; if n <> 1 then raise exception 'learner sees % questions (draft leaked?)', n; end if;
  select count(*) into n from public.deliveries; if n <> 1 then raise exception 'learner sees % deliveries', n; end if;
  -- Can't promote themselves.
  begin
    update public.profiles set role = 'author' where id = auth.uid();
    raise exception 'role change allowed';
  exception when raise_exception then
    if sqlerrm = 'role change allowed' then raise; end if;
  end;
  -- Can change their own settings.
  update public.profiles set time_zone = 'Europe/Helsinki' where id = auth.uid();
  -- Can't write content.
  begin
    insert into public.categories (name) values ('Hacked');
    raise exception 'learner wrote content';
  exception when insufficient_privilege then null;
  end;
  -- Can't write someone else's data.
  begin
    insert into public.user_topics (user_id, topic_id) values
      ('00000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000002');
    raise exception 'wrote other user data';
  exception when insufficient_privilege then null;
  end;
  insert into public.user_topics (user_id, topic_id, interest) values
    ('00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000002', 5);
end $$;
reset role;

-- As the author.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$
declare n int;
begin
  select count(*) into n from public.lessons; if n <> 5 then raise exception 'author sees % lessons', n; end if;
  insert into public.categories (name) values ('Languages');
end $$;
reset role;

-- Deleting the auth user removes all their data (D9).
delete from auth.users where email = 'learner@example.com';
do $$
declare n int;
begin
  select count(*) into n from public.user_topics; if n <> 0 then raise exception 'data left after delete'; end if;
  select count(*) into n from public.deliveries where user_id = '00000000-0000-0000-0000-00000000000b';
  if n <> 0 then raise exception 'deliveries left after delete'; end if;
end $$;

select 'all checks passed' as result;
