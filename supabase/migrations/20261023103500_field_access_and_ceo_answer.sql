-- Field attendance: anonymous CL entry with non-public invite code; CEO role claim with
-- verified email OTP plus a separate single-use organizer-controlled secret.
-- These RPCs do not expose codes or membership privileges to public browsing.
begin;

create table private.meeting_access (
    session_id uuid primary key references public.meeting_sessions(id) on delete cascade,
    cl_code_sha256 bytea,
    ceo_code_sha256 bytea,
    ceo_claimed_by uuid references auth.users(id),
    valid_until timestamptz,
    created_at timestamptz not null default now()
);
revoke all on private.meeting_access from public,anon,authenticated;

-- A person must first sign in via Supabase Auth (anonymous attendee or email-verified CEO).
-- This is an access-restricted event, not a public anonymous discussion forum.
create function public.join_ceo_cl_meeting(p_code text,p_display_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  room_id uuid;
  access private.meeting_access%rowtype;
  found_member public.meeting_members%rowtype;
  person text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  person := left(trim(coalesce(p_display_name,'')),40);
  if length(person) < 1 then person := 'Change Leader'; end if;
  select id into room_id from public.meeting_sessions
    where slug='ceo-cl-2026' and is_open=true limit 1;
  if not found then raise exception 'Meeting is closed'; end if;
  select * into access from private.meeting_access where session_id=room_id;
  if access.cl_code_sha256 is null or access.valid_until < now() or
     length(coalesce(p_code,'')) > 80 or
     sha256(convert_to(upper(trim(coalesce(p_code,''))),'UTF8')) != access.cl_code_sha256
  then raise exception 'Invalid meeting code'; end if;
  select * into found_member from public.meeting_members where user_id=auth.uid();
  if found then
    -- A CEO or moderator never has their server-assigned role downgraded by a CL code.
    if found_member.is_active=false then raise exception 'Access revoked'; end if;
    if found_member.role='cl' then
      update public.meeting_members set display_name=person where user_id=auth.uid();
    end if;
    return found_member.role::text;
  end if;
  insert into public.meeting_members(user_id,display_name,role,is_active)
  values(auth.uid(),person,'cl',true);
  return 'cl';
end;$$;
revoke all on function public.join_ceo_cl_meeting(text,text) from public,anon;
grant execute on function public.join_ceo_cl_meeting(text,text) to authenticated;

-- We also check the auth.users row under the definer, not only a user-controlled name.
-- The one-time host code should be handed to the CEO personally, never embedded in JS.
create function public.claim_ceo_cl_host(p_ceo_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  room_id uuid;
  access private.meeting_access%rowtype;
  verified_email text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then
    raise exception 'CEO requires verified email sign-in';
  end if;
  select email into verified_email from auth.users
    where id=auth.uid() and email_confirmed_at is not null;
  if verified_email is null then raise exception 'Verified email required'; end if;
  select id into room_id from public.meeting_sessions where slug='ceo-cl-2026' limit 1;
  if room_id is null then raise exception 'Meeting not configured'; end if;
  select * into access from private.meeting_access where session_id=room_id for update;
  if access.ceo_claimed_by is not null and access.ceo_claimed_by <> auth.uid() then
     raise exception 'CEO role already claimed';
  end if;
  if access.ceo_code_sha256 is null or access.valid_until < now() or
     length(coalesce(p_ceo_code,'')) > 80 or
     sha256(convert_to(upper(trim(coalesce(p_ceo_code,''))),'UTF8')) != access.ceo_code_sha256
  then raise exception 'Invalid CEO access code'; end if;
  update private.meeting_access set ceo_claimed_by=auth.uid() where session_id=room_id;
  insert into public.meeting_members(user_id,display_name,role,is_active)
    values(auth.uid(),'CEO','ceo',true)
    on conflict(user_id) do update
      set role='ceo', display_name='CEO', is_active=true;
  return 'ceo';
end;$$;
revoke all on function public.claim_ceo_cl_host(text) from public,anon;
grant execute on function public.claim_ceo_cl_host(text) to authenticated;

-- No guest RLS exposure. Inactive accounts remain denied after revocation.
commit;
