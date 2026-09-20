-- Novi schema, as applied to the hosted project.
--
-- People are identified by email throughout: someone can be invited to a folder
-- before they ever sign in, and their membership resolves once they do.

/* ---------------- tables ---------------- */

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '📁',
  owner_email text not null,
  created_at timestamptz not null default now()
);

create table public.folder_members (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders (id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  invited_by text,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (folder_id, email)
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders (id) on delete cascade,
  name text not null,
  accent text not null default 'blue',
  owner_email text not null,
  created_at timestamptz not null default now()
);

create table public.board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  invited_by text,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (board_id, email)
);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  list_id uuid not null references public.lists (id) on delete cascade,
  title text not null,
  description text not null default '',
  due_date timestamptz,
  remind_before integer not null default 60,
  assignee_email text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  done boolean not null default false,
  sort_order integer not null default 0,
  notified_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);

create index folder_members_email_idx on public.folder_members (lower(email));
create index board_members_email_idx on public.board_members (lower(email));
create index boards_folder_idx on public.boards (folder_id);
create index lists_board_idx on public.lists (board_id);
create index cards_board_idx on public.cards (board_id);
create index cards_list_idx on public.cards (list_id, sort_order);
create index cards_assignee_idx on public.cards (lower(assignee_email));

/* ---------------- access helpers ----------------
 * These are SECURITY DEFINER so they bypass RLS on the tables they read, which
 * is what stops a policy on folder_members from recursing into itself.
 */

create or replace function public.current_email()
returns text language sql stable security definer set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where lower(a.email) = public.current_email());
$$;

create or replace function public.folder_role(p_folder uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when public.current_email() = '' then null
    when public.is_admin() then 'owner'
    when exists (
      select 1 from public.folders f
      where f.id = p_folder and lower(f.owner_email) = public.current_email()
    ) then 'owner'
    else (
      select fm.role from public.folder_members fm
      where fm.folder_id = p_folder and lower(fm.email) = public.current_email()
      limit 1
    )
  end;
$$;

create or replace function public.board_role(p_board uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when public.current_email() = '' then null
    when public.is_admin() then 'owner'
    when exists (
      select 1 from public.boards b
      where b.id = p_board and lower(b.owner_email) = public.current_email()
    ) then 'owner'
    else coalesce(
      (
        select bm.role from public.board_members bm
        where bm.board_id = p_board and lower(bm.email) = public.current_email()
        limit 1
      ),
      -- otherwise inherit whatever the folder grants
      (select public.folder_role(b.folder_id) from public.boards b where b.id = p_board)
    )
  end;
$$;

create or replace function public.can_edit_board(p_board uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.board_role(p_board) in ('owner', 'editor'), false);
$$;

/* ---------------- row level security ---------------- */

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.folders enable row level security;
alter table public.folder_members enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.lists enable row level security;
alter table public.cards enable row level security;

create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- readable so the app can tell you that you are an admin; only the service role
-- may change who is one
create policy "read admins" on public.admins
  for select to authenticated using (true);

create policy "read folders you belong to" on public.folders
  for select to authenticated using (public.folder_role(id) is not null);

create policy "create your own folders" on public.folders
  for insert to authenticated
  with check (lower(owner_email) = public.current_email() or public.is_admin());

create policy "folder owners update" on public.folders
  for update to authenticated
  using (public.folder_role(id) = 'owner') with check (public.folder_role(id) = 'owner');

create policy "folder owners delete" on public.folders
  for delete to authenticated using (public.folder_role(id) = 'owner');

create policy "read folder members" on public.folder_members
  for select to authenticated using (public.folder_role(folder_id) is not null);

create policy "folder owners add members" on public.folder_members
  for insert to authenticated with check (public.folder_role(folder_id) = 'owner');

create policy "folder owners change members" on public.folder_members
  for update to authenticated
  using (public.folder_role(folder_id) = 'owner')
  with check (public.folder_role(folder_id) = 'owner');

create policy "folder owners remove members" on public.folder_members
  for delete to authenticated using (public.folder_role(folder_id) = 'owner');

create policy "read boards you belong to" on public.boards
  for select to authenticated using (public.board_role(id) is not null);

create policy "folder editors create boards" on public.boards
  for insert to authenticated with check (public.folder_role(folder_id) in ('owner', 'editor'));

create policy "board owners update" on public.boards
  for update to authenticated
  using (public.board_role(id) = 'owner') with check (public.board_role(id) = 'owner');

create policy "board owners delete" on public.boards
  for delete to authenticated using (public.board_role(id) = 'owner');

create policy "read board members" on public.board_members
  for select to authenticated using (public.board_role(board_id) is not null);

create policy "board owners add members" on public.board_members
  for insert to authenticated with check (public.board_role(board_id) = 'owner');

create policy "board owners change members" on public.board_members
  for update to authenticated
  using (public.board_role(board_id) = 'owner') with check (public.board_role(board_id) = 'owner');

create policy "board owners remove members" on public.board_members
  for delete to authenticated using (public.board_role(board_id) = 'owner');

create policy "read lists" on public.lists
  for select to authenticated using (public.board_role(board_id) is not null);

create policy "editors write lists" on public.lists
  for insert to authenticated with check (public.can_edit_board(board_id));

create policy "editors update lists" on public.lists
  for update to authenticated
  using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));

create policy "editors delete lists" on public.lists
  for delete to authenticated using (public.can_edit_board(board_id));

create policy "read cards" on public.cards
  for select to authenticated using (public.board_role(board_id) is not null);

create policy "editors write cards" on public.cards
  for insert to authenticated with check (public.can_edit_board(board_id));

create policy "editors update cards" on public.cards
  for update to authenticated
  using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));

create policy "editors delete cards" on public.cards
  for delete to authenticated using (public.can_edit_board(board_id));

/* ---------------- signup, invitations, ordering ---------------- */

-- A new account gets a profile, and every invitation waiting on that address
-- becomes theirs.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set email = excluded.email;

  update public.folder_members set accepted_at = now()
   where lower(email) = lower(new.email) and accepted_at is null;

  update public.board_members set accepted_at = now()
   where lower(email) = lower(new.email) and accepted_at is null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The other order: the person already had an account when they were invited,
-- so they accept it by signing in.
create or replace function public.accept_my_invitations()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text := public.current_email();
begin
  if v_email = '' then
    return;
  end if;

  update public.folder_members set accepted_at = now()
   where lower(email) = v_email and accepted_at is null;

  update public.board_members set accepted_at = now()
   where lower(email) = v_email and accepted_at is null;
end;
$$;

-- Reordering happens as one call: the client sends the destination list and the
-- ids in their new order, so a drag never leaves positions half-written.
create or replace function public.reorder_cards(p_list uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare
  v_board uuid;
begin
  select board_id into v_board from public.lists where id = p_list;
  if v_board is null then
    raise exception 'unknown list';
  end if;
  if not public.can_edit_board(v_board) then
    raise exception 'not allowed to change this board';
  end if;

  update public.cards c
     set list_id = p_list, sort_order = ord.position
    from (select unnest(p_ids) as id, generate_subscripts(p_ids, 1) as position) ord
   where c.id = ord.id and c.board_id = v_board;
end;
$$;

create or replace function public.reorder_lists(p_board uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_edit_board(p_board) then
    raise exception 'not allowed to change this board';
  end if;

  update public.lists l
     set sort_order = ord.position
    from (select unnest(p_ids) as id, generate_subscripts(p_ids, 1) as position) ord
   where l.id = ord.id and l.board_id = p_board;
end;
$$;

/* ---------------- who may call what ---------------- */

-- Postgres grants EXECUTE to PUBLIC on every new function, and anon inherits
-- that, so revoking from anon alone would change nothing.
revoke execute on function public.current_email() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.folder_role(uuid) from public, anon;
revoke execute on function public.board_role(uuid) from public, anon;
revoke execute on function public.can_edit_board(uuid) from public, anon;
revoke execute on function public.reorder_cards(uuid, uuid[]) from public, anon;
revoke execute on function public.reorder_lists(uuid, uuid[]) from public, anon;
revoke execute on function public.accept_my_invitations() from public, anon;

-- never reachable over the API: it only ever runs as a trigger
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- The rest stay callable by signed-in users: RLS policies evaluate them, and
-- each one only ever reports on the caller themselves.
grant execute on function public.current_email() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.folder_role(uuid) to authenticated;
grant execute on function public.board_role(uuid) to authenticated;
grant execute on function public.can_edit_board(uuid) to authenticated;
grant execute on function public.reorder_cards(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_lists(uuid, uuid[]) to authenticated;
grant execute on function public.accept_my_invitations() to authenticated;

/* ---------------- live updates ---------------- */

alter publication supabase_realtime add table public.folders;
alter publication supabase_realtime add table public.folder_members;
alter publication supabase_realtime add table public.boards;
alter publication supabase_realtime add table public.board_members;
alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.cards;
