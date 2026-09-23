-- Deliverables & Pricing: milestone line items per board, each with a price,
-- a status the freelancer (owner/editor) moves along, and a client-facing
-- approval + payment-release step any board member can act on.

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null,
  description text not null default '',
  price numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed')),
  approved boolean not null default false,
  approved_at timestamptz,
  paid boolean not null default false,
  paid_at timestamptz,
  sort_order integer not null default 0,
  created_by text,
  created_at timestamptz not null default now()
);

create index deliverables_board_idx on public.deliverables (board_id, sort_order);

alter table public.deliverables enable row level security;

create policy "read deliverables" on public.deliverables
  for select to authenticated using (public.board_role(board_id) is not null);

create policy "editors write deliverables" on public.deliverables
  for insert to authenticated with check (public.can_edit_board(board_id));

-- General updates (title, price, status, description) stay with the
-- freelancer side. Approving and releasing payment go through their own
-- RPCs below, open to any board member, so a viewer ("client") can act on
-- those two things without being able to edit anything else.
create policy "editors update deliverables" on public.deliverables
  for update to authenticated
  using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));

create policy "editors delete deliverables" on public.deliverables
  for delete to authenticated using (public.can_edit_board(board_id));

create or replace function public.approve_deliverable(p_id uuid, p_approved boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_board uuid;
begin
  select board_id into v_board from public.deliverables where id = p_id;
  if v_board is null then
    raise exception 'unknown deliverable';
  end if;
  if public.board_role(v_board) is null then
    raise exception 'not allowed to act on this board';
  end if;

  update public.deliverables
     set approved = p_approved,
         approved_at = case when p_approved then now() else null end
   where id = p_id;
end;
$$;

-- One batch call per board: marks every completed, approved, unpaid item as
-- paid, so a release can't leave some items half-updated.
create or replace function public.release_payment(p_board uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.board_role(p_board) is null then
    raise exception 'not allowed to act on this board';
  end if;

  update public.deliverables
     set paid = true, paid_at = now()
   where board_id = p_board and status = 'completed' and approved = true and paid = false;
end;
$$;

revoke execute on function public.approve_deliverable(uuid, boolean) from public, anon;
revoke execute on function public.release_payment(uuid) from public, anon;
grant execute on function public.approve_deliverable(uuid, boolean) to authenticated;
grant execute on function public.release_payment(uuid) to authenticated;

alter publication supabase_realtime add table public.deliverables;
