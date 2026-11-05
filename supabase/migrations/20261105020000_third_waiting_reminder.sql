-- A last "still here" email 30 days after the second "lessons waiting" email
-- (B6), so a learner who drifted away hears from Pisara once more, then never
-- again until they read a lesson. Allows the count to reach 3.

alter table public.profiles drop constraint profiles_waiting_reminders_sent_check;
alter table public.profiles add constraint profiles_waiting_reminders_sent_check
  check (waiting_reminders_sent between 0 and 3);
