-- A manual deliverable can now be attributed to someone on the team, the
-- same way a task can, so it counts toward that person's total too.

alter table public.deliverables add column assignee_email text;

create index deliverables_assignee_idx on public.deliverables (lower(assignee_email));
