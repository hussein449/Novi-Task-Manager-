-- Meeting boards: a whiteboard per meeting, filed under a project. Every note,
-- text box, frame and pen stroke is its own row, so two people writing at the
-- same time each save their own items instead of overwriting one shared blob.

create table public.meeting_boards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meeting_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meeting_boards (id) on delete cascade,
  kind text not null,
  x double precision not null default 0,
  y double precision not null default 0,
  w double precision,
  h double precision,
  color text not null default 'yellow',
  text text not null default '',
  points jsonb,
  size real,
  z integer not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- highlight: a translucent wide stroke; frame: a labelled area to group notes
  constraint meeting_items_kind_check
    check (kind in ('note', 'text', 'stroke', 'highlight', 'frame'))
);

create index meeting_boards_board_idx on public.meeting_boards (board_id);
create index meeting_items_meeting_idx on public.meeting_items (meeting_id);

-- A meeting inherits the access of the project it is filed under.
create or replace function public.meeting_role(p_meeting uuid)
returns text language sql stable security definer set search_path = public as $$
  select public.board_role(m.board_id) from public.meeting_boards m where m.id = p_meeting;
$$;

revoke execute on function public.meeting_role(uuid) from public, anon;
grant execute on function public.meeting_role(uuid) to authenticated;

alter table public.meeting_boards enable row level security;
alter table public.meeting_items enable row level security;

create policy "read meetings of your projects" on public.meeting_boards
  for select to authenticated using (public.board_role(board_id) is not null);

create policy "editors create meetings" on public.meeting_boards
  for insert to authenticated with check (public.can_edit_board(board_id));

create policy "editors update meetings" on public.meeting_boards
  for update to authenticated
  using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));

create policy "editors delete meetings" on public.meeting_boards
  for delete to authenticated using (public.can_edit_board(board_id));

create policy "read meeting items" on public.meeting_items
  for select to authenticated using (public.meeting_role(meeting_id) is not null);

create policy "editors write meeting items" on public.meeting_items
  for insert to authenticated with check (public.meeting_role(meeting_id) in ('owner', 'editor'));

create policy "editors update meeting items" on public.meeting_items
  for update to authenticated
  using (public.meeting_role(meeting_id) in ('owner', 'editor'))
  with check (public.meeting_role(meeting_id) in ('owner', 'editor'));

create policy "editors delete meeting items" on public.meeting_items
  for delete to authenticated using (public.meeting_role(meeting_id) in ('owner', 'editor'));

-- Keep meeting_boards.updated_at meaning "last time anyone wrote on it", so the
-- list can sort by recent activity without counting items.
create or replace function public.touch_meeting()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.meeting_boards
     set updated_at = now()
   where id = coalesce(new.meeting_id, old.meeting_id);
  return null;
end;
$$;

revoke execute on function public.touch_meeting() from public, anon, authenticated;

create trigger meeting_items_touch
  after insert or update or delete on public.meeting_items
  for each row execute function public.touch_meeting();

-- Deletes carry only the primary key by default; with the full row the client
-- can tell which meeting a removed item belonged to.
alter table public.meeting_items replica identity full;

alter publication supabase_realtime add table public.meeting_boards;
alter publication supabase_realtime add table public.meeting_items;
