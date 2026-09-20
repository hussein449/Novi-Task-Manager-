# Novi — Task Manager

A responsive, Trello-style task manager with drag & drop, deadlines and reminders.
Built with React 18, Vite and Tailwind CSS v4 in a clean, neutral interface: white
surfaces, grey dividers and a single blue accent. Everything is stored locally in
the browser, so there is no backend to run.

## What it does

- **Name-based login + invites** — sign in with just your name. Invite people to a
  board by name, or send an invite link that carries the whole board (lists, cards,
  members) to another browser.
- **Folders → boards → tasks** — group boards in folders, one per client or project.
- **People per folder** — each folder has its own member list, opened from Projects
  or from the Overview. Add someone by name, by email, or both (an email on its own
  becomes their name), give them a role, see their open and done counts, or remove
  them. Folder membership is what grants access: adding someone puts them on every
  board in that folder, changing their role changes it everywhere in the folder, and
  removing them takes them off every board and unassigns their tasks. Each folder
  also has its own invite link carrying the folder with all its boards and tasks.
- **Three statuses out of the box** — To Do / Doing / Done. The board is a task
  list grouped by status: one row per task with its deadline, priority and
  assignee in aligned columns, and a group header you can collapse. Nothing
  scrolls sideways at any width. Statuses can be renamed, added or deleted, and
  moving a task into the last one marks it complete.
- **Roles** — every person on a folder or board is an owner, an editor or a viewer. Editors
  add and change tasks; viewers can read the board but get no add buttons, no drag
  handles and a read-only task dialog; only the owner invites people, sets their
  role, renames the board or changes its colour.
- **Deadline calendar** — a panel beside the board, opened and closed from the top
  bar, showing the month with a coloured dot per person on each day. Filter it to
  one person, click a day to list what is due, click a task to open it.
- **Drag & drop** — powered by dnd-kit, with pointer, touch and keyboard sensors,
  so it works on a phone as well as a desktop. Drag a row by its handle to reorder
  it or to move it to another status.
- **Deadlines, assignees, priorities** — every card carries a due date, an assigned
  board member, a priority and a description.
- **Reminders** — pick a lead time per card (at the deadline, 10 min, 1 hour, 3 hours,
  1 day, 2 days before). Reminders surface as in-app toasts and as desktop
  notifications once you allow them.
- **Planner** — every deadline across every board, grouped into Overdue / Today /
  Tomorrow / This week / Later.
- **Overview** — headline counts, then a section per project folder: its boards
  with progress, and the people in that folder with their role and workload.
  Finishes with the next deadlines across every folder.
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
    Board.jsx            DndContext, status groups, calendar panel, drag overlay
    StatusGroup.jsx      one status group: header, rows, inline add
    TaskRow.jsx          a sortable task row and its visual face
    Calendar.jsx         month calendar of deadlines, filtered per person
    CardModal.jsx        deadline, reminder, assignee, status, priority
    BoardsView.jsx       folders and boards, create/delete
    Planner.jsx          deadlines grouped by time bucket
    Inbox.jsx            fired reminders and my open cards
    Overview.jsx         cross-board stats
    InviteModal.jsx          invite to one board, by name or email, + invite link
    FolderMembersModal.jsx   a folder's people: add, set roles, remove, invite link
    Chrome.jsx           top bar, sidebar, mobile menu and nav, toasts
    ui.jsx               icons, avatars, modal, buttons
```

### State

One reducer in `src/store.jsx` holds `folders`, `boards`, `cards`, the signed-in
`user` and fired `notifications`. It is persisted to `localStorage` under
`novi.task-manager.v1` on every change and rehydrated on load.

### Drag and drop

Three things keep dropping reliable, and each fixes a real failure: the droppable
covers the whole status group rather than just its rows; collision detection is
`pointerWithin`, so the group under the cursor wins; and droppables re-measure
with `MeasuringStrategy.Always`, so rects are never stale after the layout
shifts. `html { scrollbar-gutter: stable }` matters too — without it a scrollbar
appearing mid-drag resizes the window, and dnd-kit cancels a drag on resize.

### Invite links

An invite link is `?join=<code>`, where the code is a URL-safe base64 payload: a
folder with its boards and tasks, or a single board with its tasks. Opening the
link imports it into the recipient's workspace.
Because storage is local, this copies the board rather than syncing it live — a
backend would be the next step if you want real-time collaboration.

## Notes and limits

- Data lives in the browser: clearing site data clears the boards, and two people on
  two devices each hold their own copy.
- Desktop notifications need the browser tab to stay open and permission granted.
