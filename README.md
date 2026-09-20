# Novi — Task Manager

A responsive, Trello-style task manager with drag & drop, deadlines and reminders.
Built with React 18, Vite and Tailwind CSS v4 in a clean, neutral interface: white
surfaces, grey dividers and a single blue accent. Everything is stored locally in
the browser, so there is no backend to run.

## What it does

- **Name-based login + invites** — sign in with just your name. Invite people to a
  board by name, or send an invite link that carries the whole board (lists, cards,
  members) to another browser.
- **Folders → boards → cards** — group boards in folders, one per client or project.
- **Three statuses out of the box** — To Do / Doing / Done. Lists can be renamed,
  added or deleted, and dropping a card in the last list marks it complete.
- **Drag & drop** — powered by dnd-kit, with pointer, touch and keyboard sensors, so
  it works on a phone as well as a desktop.
- **Deadlines, assignees, priorities** — every card carries a due date, an assigned
  board member, a priority and a description.
- **Reminders** — pick a lead time per card (at the deadline, 10 min, 1 hour, 3 hours,
  1 day, 2 days before). Reminders surface as in-app toasts and as desktop
  notifications once you allow them.
- **Planner** — every deadline across every board, grouped into Overdue / Today /
  Tomorrow / This week / Later.
- **Overview** — completion rate, overdue counts, per-board progress, workload per
  person and the next deadlines.
- **Inbox** — reminders that have fired, plus everything assigned to you.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

To make a production build:

```bash
npm run build
```

The output lands in `dist/` and can be served by any static host (GitHub Pages,
Netlify, Vercel). `vite.config.js` uses a relative `base`, so it also works from a
sub-path.

## How it is put together

```
src/
  store.jsx              state, reducer and localStorage persistence
  lib/utils.js           ids, colors, date formatting, invite encoding
  lib/useReminders.js    the deadline watcher behind toasts and notifications
  components/
    Board.jsx            DndContext, lists, drag overlay
    List.jsx             a single status column
    TaskCard.jsx         sortable card + its visual face
    CardModal.jsx        deadline, reminder, assignee, status, priority
    BoardsView.jsx       folders and boards, create/delete
    Planner.jsx          deadlines grouped by time bucket
    Inbox.jsx            fired reminders and my open cards
    Overview.jsx         cross-board stats
    InviteModal.jsx      invite by name + invite link
    Chrome.jsx           top bar, sidebar, mobile menu and nav, toasts
    ui.jsx               icons, avatars, modal, buttons
```

### State

One reducer in `src/store.jsx` holds `folders`, `boards`, `cards`, the signed-in
`user` and fired `notifications`. It is persisted to `localStorage` under
`novi.task-manager.v1` on every change and rehydrated on load.

### Invite links

An invite link is `?join=<code>`, where the code is a URL-safe base64 of the board
and its cards. Opening the link imports that board into the recipient's workspace.
Because storage is local, this copies the board rather than syncing it live — a
backend would be the next step if you want real-time collaboration.

## Notes and limits

- Data lives in the browser: clearing site data clears the boards, and two people on
  two devices each hold their own copy.
- Desktop notifications need the browser tab to stay open and permission granted.
