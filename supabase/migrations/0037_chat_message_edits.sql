begin;
-- Edits update only current text. Existing moderation reports retain the exact
-- snapshot captured when the report was made. No edit-history access is added.
alter table public.chat_messages add column edited_at timestamptz;
alter table public.chat_messages add column revision integer not null default 0;
create function public.chat_edit_message(p_conversation_id uuid,p_message_id uuid,p_body text,p_expected_revision integer)
returns setof public.chat_messages language plpgsql security definer set search_path='' as $$
declare m public.chat_messages; v_body text:=btrim(p_body);
begin
 perform public.care_thread_access(p_conversation_id,true);
 if v_body is null or char_length(v_body) not between 1 and 2000 then raise exception 'invalid_message'; end if;
 select * into m from public.chat_messages where id=p_message_id and conversation_id=p_conversation_id for update;
 if not found or m.author_id<>auth.uid() then raise exception 'message_not_allowed' using errcode='42501'; end if;
 if p_expected_revision is null or m.revision<>p_expected_revision then raise exception 'message_edit_conflict'; end if;
 if m.body=v_body then return next m; return; end if;
 update public.chat_messages set body=v_body,edited_at=now(),revision=revision+1 where id=m.id returning * into m;
 return next m;
end $$;
revoke all on function public.chat_edit_message(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.chat_edit_message(uuid,uuid,text,integer) to authenticated;
commit;
