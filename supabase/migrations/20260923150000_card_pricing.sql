-- Lets a price be set directly on a task, so Deliverables & Pricing can pull
-- every task on a board automatically instead of re-entering each one by
-- hand. A task counts toward "ready to pay" once it's done and priced — no
-- separate client approval step, unlike a manual deliverable.

alter table public.cards add column price numeric(12, 2) not null default 0;
alter table public.cards add column paid boolean not null default false;
alter table public.cards add column paid_at timestamptz;

-- Releasing payment now settles both: approved manual deliverables, and any
-- done, priced task that hasn't been marked paid yet.
create or replace function public.release_payment(p_board uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.board_role(p_board) is null then
    raise exception 'not allowed to act on this board';
  end if;

  update public.deliverables
     set paid = true, paid_at = now()
   where board_id = p_board and status = 'completed' and approved = true and paid = false;

  update public.cards
     set paid = true, paid_at = now()
   where board_id = p_board and done = true and price > 0 and paid = false;
end;
$$;
