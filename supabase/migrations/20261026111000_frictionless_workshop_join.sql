-- Frictionless public workshop: no attendance code, email or user-visible login.
-- Supabase Auth still creates a transient anonymous identity behind the scenes.
-- CEO/moderator roles remain server-assigned and cannot be self-selected.

begin;

create function public.join_public_workshop()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_room public.meeting_sessions%rowtype;
  v_member public.meeting_members%rowtype;
begin
  if auth.uid() is null then raise exception 'A session is required'; end if;
  select * into v_room from public.meeting_sessions
  where slug='ceo-cl-2026' limit 1;
  if not found then raise exception 'Workshop is not configured'; end if;

  -- Visitors may READ after event closure; existing RLS prevents new questions.
  -- Revoked accounts must not be able to re-enable themselves.
  select * into v_member from public.meeting_members where user_id = auth.uid();
  if found and not v_member.is_active then raise exception 'This session has been revoked'; end if;
  if not found then
    insert into public.meeting_members(user_id,display_name,role,is_active)
      values(auth.uid(),'참가자','cl',true)
      on conflict (user_id) do nothing;
  end if;
  select * into v_member from public.meeting_members where user_id = auth.uid();
  if not v_member.is_active then raise exception 'This session has been revoked'; end if;

  return jsonb_build_object('role',v_member.role,'meeting_id',v_room.id,'is_open',v_room.is_open);
end;
$$;

revoke all on function public.join_public_workshop() from public,anon;
grant execute on function public.join_public_workshop() to authenticated;

-- Session state is also refreshed via authenticated polling so closing the
-- workshop propagates to already-open mobile clients without page reload.
commit;
