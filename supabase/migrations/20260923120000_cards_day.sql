-- Which day's To Do list a card belongs to. Kept separate from due_date (an
-- optional deadline with its own reminder) so adding a task to today's list
-- never triggers a notification.

alter table public.cards add column day date;

create index cards_day_idx on public.cards (list_id, day);
