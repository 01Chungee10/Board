-- In-person fallback for the CEO's device when Supabase-managed SMTP is unavailable.
-- A strong one-use host secret is delivered directly by the organizer to the CEO.
-- As with an email OTP, the server role is granted ONLY after validating the
-- organizer-controlled code. This path offers possession-based, not email-based,
-- identity assurance; it must never be displayed in the publicly hosted JS/UI.
begin;
create function public.claim_ceo_cl_on_site(p_ceo_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  room_id uuid;
  access private.meeting_access%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign-in required'; end if;
  select id into room_id from public.meeting_sessions where slug='ceo-cl-2026' and is_open=true limit 1;
  if room_id is null then raise exception 'Meeting closed'; end if;
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
    on conflict (user_id) do update set role='ceo',display_name='CEO',is_active=true;
  return 'ceo';
end;$$;
revoke all on function public.claim_ceo_cl_on_site(text) from public,anon;
grant execute on function public.claim_ceo_cl_on_site(text) to authenticated;
commit;
