-- Keep the backend meeting title consistent with the workshop homepage.
-- One-field question composition accepts meaningful short (4+ character) questions.
begin;
update public.meeting_sessions
   set title='현대제철 CEO–CL 온라인 워크숍'
 where slug='ceo-cl-2026';
alter table public.meeting_posts drop constraint if exists meeting_posts_content_check;
alter table public.meeting_posts
  add constraint meeting_posts_content_check
  check (char_length(trim(content)) between 4 and 3000);
commit;
