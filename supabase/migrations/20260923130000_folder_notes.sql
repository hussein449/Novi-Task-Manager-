-- A single free-form notepad per folder: general points jotted down before
-- they become actual tasks on one of its boards.

alter table public.folders add column notes text not null default '';

-- A dedicated RPC rather than a column-level policy: it lets editors (not
-- just the owner) write notes without opening up the folder's name, emoji or
-- ownership to anyone but the owner.
create or replace function public.update_folder_notes(p_folder uuid, p_notes text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.folder_role(p_folder) in ('owner', 'editor')) then
    raise exception 'not allowed to edit notes for this folder';
  end if;
  update public.folders set notes = p_notes where id = p_folder;
end;
$$;

revoke execute on function public.update_folder_notes(uuid, text) from public, anon;
grant execute on function public.update_folder_notes(uuid, text) to authenticated;
