-- CEO–CL Townhall: isolated, role-bound realtime tables.
-- IMPORTANT: Apply only to a company-approved Supabase project. It does not touch legacy posts/comments.
-- Create Auth users via a trusted admin invite process, then add meeting_members using their auth UUIDs.

begin;

-- Security-definer helpers live outside exposed REST API schemas.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.meeting_role as enum ('cl','ceo','moderator');

create table public.meeting_members (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null check (length(trim(display_name)) between 1 and 70),
    role public.meeting_role not null default 'cl',
    is_active boolean not null default true,
    joined_at timestamptz not null default now()
);

create table public.meeting_sessions (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (length(slug) between 5 and 64),
    title text not null,
    is_open boolean not null default false,
    starts_at timestamptz,
    created_at timestamptz not null default now()
);

create table public.meeting_posts (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.meeting_sessions(id) on delete restrict,
    author_name text not null default 'Change Leader',
    is_anonymous boolean not null default true,
    kind text not null check (kind in ('question','idea','voice')),
    title text not null check (char_length(trim(title)) between 4 and 120),
    content text not null check (char_length(trim(content)) between 10 and 3000),
    status text not null default 'open' check (status in ('open','hidden')),
    reaction_count integer not null default 0 check (reaction_count >= 0),
    created_at timestamptz not null default now(),
    unique (id, session_id)
);
create index meeting_posts_session_date on public.meeting_posts(session_id,created_at desc);

create table public.meeting_replies (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null,
    post_id uuid not null,
    author_name text not null default 'Change Leader',
    author_role public.meeting_role not null default 'cl',
    is_anonymous boolean not null default true,
    content text not null check (char_length(trim(content)) between 2 and 2000),
    created_at timestamptz not null default now(),
    foreign key (post_id,session_id) references public.meeting_posts(id,session_id) on delete restrict
);
create index meeting_replies_session_date on public.meeting_replies(session_id,created_at);
create index meeting_replies_post on public.meeting_replies(post_id,created_at);

create table public.meeting_reactions (
    post_id uuid not null,
    session_id uuid not null,
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (post_id,user_id),
    foreign key (post_id,session_id) references public.meeting_posts(id,session_id) on delete restrict
);
create index meeting_reactions_session on public.meeting_reactions(session_id,post_id);

-- Store identifiable authorship separately: participant-facing posts and realtime events
-- NEVER reveal UUID identity for anonymous authors. Only moderators can inspect audit mappings.
create table public.meeting_post_authors (
    post_id uuid primary key references public.meeting_posts(id) on delete restrict,
    user_id uuid not null references auth.users(id) on delete restrict,
    recorded_at timestamptz not null default now()
);
create table public.meeting_reply_authors (
    reply_id uuid primary key references public.meeting_replies(id) on delete restrict,
    user_id uuid not null references auth.users(id) on delete restrict,
    recorded_at timestamptz not null default now()
);

-- Roles are derived exclusively from the administratively managed membership table.
create function private.meeting_member_role()
returns public.meeting_role language sql stable security definer
set search_path = '' as $$
  select role from public.meeting_members
  where user_id = (select auth.uid()) and is_active = true limit 1;
$$;

create function private.is_active_meeting_member()
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (select 1 from public.meeting_members
    where user_id = (select auth.uid()) and is_active = true);
$$;

-- Inserting users cannot forge their role, display name, or user ID.
create function private.meeting_fill_post_author()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.meeting_members%rowtype;
begin
  select * into m from public.meeting_members where user_id = auth.uid() and is_active = true;
  if not found then raise exception 'Meeting invitation required'; end if;
  new.author_name := case when new.is_anonymous then '익명 CL' else m.display_name end;
  new.status := 'open';
  new.reaction_count := 0;
  new.created_at := now();
  return new;
end;$$;
create trigger meeting_post_author_before_insert before insert on public.meeting_posts
for each row execute function private.meeting_fill_post_author();

create function private.meeting_record_post_author()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.meeting_post_authors(post_id,user_id) values(new.id,auth.uid());
  return new;
end;$$;
create trigger meeting_post_author_after_insert after insert on public.meeting_posts
for each row execute function private.meeting_record_post_author();

create function private.meeting_post_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if private.meeting_member_role() = 'moderator' then return new; end if;
  select count(*) into n from public.meeting_post_authors a
    join public.meeting_posts p on p.id=a.post_id
    where a.user_id=auth.uid() and p.created_at > now() - interval '1 minute';
  if n >= 3 then raise exception 'Question rate limit exceeded'; end if;
  return new;
end;$$;
create trigger meeting_post_rate_before_insert before insert on public.meeting_posts
for each row execute function private.meeting_post_rate_limit();


create function private.meeting_fill_reply_author()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.meeting_members%rowtype;
begin
  select * into m from public.meeting_members where user_id = auth.uid() and is_active = true;
  if not found then raise exception 'Meeting invitation required'; end if;
  new.author_name := case when new.is_anonymous and m.role <> 'ceo' then '익명 CL' else m.display_name end;
  new.author_role := m.role;
  if m.role = 'ceo' then new.is_anonymous := false; new.author_name := m.display_name; end if;
  new.created_at := now();
  return new;
end;$$;
create trigger meeting_reply_author_before_insert before insert on public.meeting_replies
for each row execute function private.meeting_fill_reply_author();

create function private.meeting_record_reply_author()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.meeting_reply_authors(reply_id,user_id) values(new.id,auth.uid());
  return new;
end;$$;
create trigger meeting_reply_author_after_insert after insert on public.meeting_replies
for each row execute function private.meeting_record_reply_author();

create function private.meeting_reply_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if private.meeting_member_role() = 'moderator' then return new; end if;
  select count(*) into n from public.meeting_reply_authors a
    join public.meeting_replies r on r.id=a.reply_id
    where a.user_id=auth.uid() and r.created_at > now() - interval '1 minute';
  if n >= 8 then raise exception 'Reply rate limit exceeded'; end if;
  return new;
end;$$;
create trigger meeting_reply_rate_before_insert before insert on public.meeting_replies
for each row execute function private.meeting_reply_rate_limit();


create function private.meeting_fill_reaction_author()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_active_meeting_member() then raise exception 'Meeting invitation required'; end if;
  new.user_id := auth.uid();
  new.created_at := now();
  return new;
end;$$;
create trigger meeting_reaction_author_before_insert before insert on public.meeting_reactions
for each row execute function private.meeting_fill_reaction_author();

-- One vote per verified user. Store aggregate on post, but expose each user's vote only to themselves.
create function private.meeting_update_reaction_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.meeting_posts
     set reaction_count = greatest(0,reaction_count + case when tg_op = 'INSERT' then 1 else -1 end)
   where id = case when tg_op='INSERT' then new.post_id else old.post_id end;
  return coalesce(new,old);
end;$$;
create trigger meeting_reaction_count_after_change after insert or delete on public.meeting_reactions
for each row execute function private.meeting_update_reaction_count();

alter table public.meeting_members enable row level security;
alter table public.meeting_post_authors enable row level security;
alter table public.meeting_reply_authors enable row level security;
alter table public.meeting_sessions enable row level security;
alter table public.meeting_posts enable row level security;
alter table public.meeting_replies enable row level security;
alter table public.meeting_reactions enable row level security;

-- Supabase might apply default table grants. Remove all grants and assign least privileges below.
revoke all on public.meeting_members,public.meeting_sessions,public.meeting_posts,public.meeting_replies,public.meeting_reactions,public.meeting_post_authors,public.meeting_reply_authors from anon,authenticated;
grant select on public.meeting_members,public.meeting_post_authors,public.meeting_reply_authors to authenticated;
grant select on public.meeting_sessions to authenticated;
grant select,insert on public.meeting_posts to authenticated;
grant update(status) on public.meeting_posts to authenticated;
grant select,insert on public.meeting_replies to authenticated;
grant select,insert,delete on public.meeting_reactions to authenticated;
revoke all on function private.meeting_member_role(),private.is_active_meeting_member() from public,anon;
revoke all on function
  private.meeting_fill_post_author(),private.meeting_record_post_author(),
  private.meeting_fill_reply_author(),private.meeting_record_reply_author(),
  private.meeting_fill_reaction_author(),private.meeting_update_reaction_count(),
  private.meeting_post_rate_limit(),private.meeting_reply_rate_limit()
from public,anon,authenticated;
grant execute on function private.meeting_member_role(),private.is_active_meeting_member() to authenticated;

create policy meeting_members_read_self on public.meeting_members
  for select to authenticated using (user_id = (select auth.uid()));

create policy meeting_post_authors_mod_only on public.meeting_post_authors
  for select to authenticated using (private.meeting_member_role() = 'moderator');
create policy meeting_reply_authors_mod_only on public.meeting_reply_authors
  for select to authenticated using (private.meeting_member_role() = 'moderator');

create policy meeting_sessions_read_invited on public.meeting_sessions
  for select to authenticated using (private.is_active_meeting_member());

create policy meeting_posts_read_invited on public.meeting_posts
  for select to authenticated
  using (private.is_active_meeting_member() and (status <> 'hidden' or private.meeting_member_role() = 'moderator'));

create policy meeting_posts_insert_invited_open on public.meeting_posts
  for insert to authenticated with check (
    private.is_active_meeting_member()
    and status = 'open'
    and exists(select 1 from public.meeting_sessions s where s.id=session_id and s.is_open = true)
  );

create policy meeting_posts_moderator_hide on public.meeting_posts
  for update to authenticated using (private.meeting_member_role() = 'moderator')
  with check (private.meeting_member_role() = 'moderator');

create policy meeting_replies_read_invited on public.meeting_replies
  for select to authenticated using (
    private.is_active_meeting_member()
    and exists(select 1 from public.meeting_posts p where p.id=post_id and p.status<>'hidden')
  );

create policy meeting_replies_insert_invited_open on public.meeting_replies
  for insert to authenticated with check (
    private.is_active_meeting_member()
    and exists(select 1 from public.meeting_posts p
      join public.meeting_sessions s on s.id=p.session_id
      where p.id=post_id and p.session_id=session_id and p.status='open' and s.is_open=true)
  );

create policy meeting_reactions_read_own on public.meeting_reactions
  for select to authenticated using (private.is_active_meeting_member() and user_id = (select auth.uid()));

create policy meeting_reactions_insert_self on public.meeting_reactions
  for insert to authenticated with check (
    private.is_active_meeting_member()
    and user_id = (select auth.uid())
    and exists(select 1 from public.meeting_posts p where p.id=post_id and p.session_id=session_id and p.status='open')
  );

create policy meeting_reactions_delete_self on public.meeting_reactions
  for delete to authenticated using (private.is_active_meeting_member() and user_id = (select auth.uid()));

insert into public.meeting_sessions(slug,title,is_open) values
  ('ceo-cl-2026','현대제철 CEO–CL 온라인 미팅',false)
on conflict (slug) do nothing;

-- Enable postgres_changes for authorized subscribers. No anonymous RLS policies are defined.
do $$
declare t text;
begin
  foreach t in array array['meeting_posts','meeting_replies','meeting_reactions'] loop
    if not exists(select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;

commit;
