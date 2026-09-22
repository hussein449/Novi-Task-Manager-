# Novi — Task Manager

A responsive, Trello-style task manager with drag & drop, deadlines, reminders
and per-folder teams. React 18 + Vite + Tailwind CSS v4 on the front, Supabase
(Postgres, Auth, Realtime, Edge Functions) on the back, deployed to Netlify.

## What it does

- **Folders → projects → tasks** — group projects in folders, one per client.
- **People per folder** — a folder has its own member list. Add someone by email
  and they join every project inside it; add them to one project instead when
  that is all they need. The **People** section shows both, with roles.
- **Invitations by email** — adding someone emails them a link. When no email
  provider is configured the invitation is still recorded and the app hands you
  the link to send yourself (see [Invitations](#invitations)).
- **Roles** — owner, editor, viewer, enforced by Postgres row level security and
  not only by the interface. A viewer cannot add a task even with the API open.
- **Workspace admin** — one address owns every folder and project.
- **Three statuses out of the box** — To Do / Doing / Done as full-width groups,
  one row per task with its deadline, priority and assignee. Nothing scrolls
  sideways at any width, and statuses can be renamed, added or collapsed.
- **Drag & drop** — dnd-kit with pointer, touch and keyboard sensors. Drag a row
  by its handle to reorder it or move it to another status.
- **Deadlines and reminders** — per-task deadline with a lead time (at the
  deadline, 10 minutes, 1 hour, 3 hours, 1 day or 2 days before), delivered as
  in-app toasts and desktop notifications.
- **Deadline calendar** — a panel beside the board, with a dot per person on
  each day and a filter by person.
- **Meeting boards** — a whiteboard for each meeting, filed under a project:
  sticky notes, text, pen and highlighter in nine colours, plus frames to group
  ideas. One tap lays out *Main ideas / Brainstorm / Action items*. Everyone on the
  project sees what others write as it happens, with their avatars in the corner,
  and any note can be sent straight to the project's task list. Undo, zoom, and
  finger drawing on a phone all work.
- **Planner / Inbox / Overview** — everything due in order, the reminders that
  fired, and a per-folder breakdown of progress and workload.
- **Live** — two people on the same board see each other's changes.

## Running it locally

```bash
npm install
cp .env.example .env.local   # then fill in the three values
npm run dev
```

`.env.local`:

| Variable | Where it comes from |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → Data API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | the publishable (anon) key on the same page |
| `VITE_ADMIN_EMAIL` | the address that should own everything |

Without them the app boots into a short "set these three variables" screen
rather than failing silently.

## Deploying to Netlify

1. Push this repository to GitHub, then in Netlify choose **Add new site →
   Import an existing project** and pick it.
2. `netlify.toml` already sets the build command (`npm run build`), the publish
   directory (`dist`) and the single-page-app redirect, so the defaults are
   correct.
3. Add the same three variables under **Site configuration → Environment
   variables**, then deploy. They are read at build time, so changing one needs
   a redeploy.
4. In Supabase → **Authentication → URL Configuration**, set the site URL to
   your Netlify domain and add it to the redirect allow-list, so sign-in links
   come back to the right place.

## The backend

`supabase/migrations/` holds the schema that the hosted project runs, and
`supabase/functions/invite/` the invitation endpoint. To rebuild it on another
project:

```bash
supabase link --project-ref <ref>
supabase db push
supabase functions deploy invite
```

then, in the SQL editor:

```sql
insert into public.admins (email) values ('you@example.com');
```

### How access is decided

Everyone is identified by **email**, which is the one handle that exists before
someone has an account — that is what lets you invite a colleague and assign
them work in the same minute.

Three SECURITY DEFINER functions answer every policy: `is_admin()`,
`folder_role(folder)` and `board_role(board)`. A board inherits the folder's
role unless the person was added to that board directly. Policies then read:
anyone with a role may select; editors and owners may write tasks and lists;
only owners may change membership or delete.

Because the rules live in the database, the interface and the API agree. A
viewer who calls the REST API by hand gets `new row violates row-level security
policy` rather than a new task.

### Invitations

Adding someone calls the `invite` edge function, which:

1. writes the membership **through the caller's own token**, so row level
   security still decides whether they may invite at all, and
2. tries to email the invitation.

Step 2 needs an email provider, and providers cost money past a free tier, so
the function treats a failure as ordinary: it returns `emailed: false` with the
invitation link, and the app shows **Copy link** and **Open mail app** instead
of an error. The person is already a member either way — they just need to know.

To turn real email on, set these on the function (Supabase → Edge Functions →
invite → Secrets):

| Secret | Notes |
| --- | --- |
| `RESEND_API_KEY` | [Resend](https://resend.com) has a free tier of 3,000 emails a month |
| `INVITE_FROM_EMAIL` | e.g. `Novi <hello@yourdomain.com>`; needs a verified domain |
| `APP_URL` | fallback link base when the app does not send one |

Supabase's own auth emails (magic links, confirmations) are separate and use the
project's SMTP settings, which are rate-limited until you connect your own SMTP.

## How it is put together

```
src/
  config.js                environment: Supabase keys and the admin address
  store.jsx                state, permissions, and every write to the database
  lib/supabase.js          the client
  lib/api.js               queries, mutations, ordering RPC, invitations
  lib/useReminders.js      the deadline watcher behind toasts and notifications
  lib/utils.js             ids, colours, dates, email helpers
  components/
    Board.jsx              DndContext, status groups, calendar panel
    StatusGroup.jsx        one status: header, rows, inline add
    TaskRow.jsx            a sortable task row and its visual face
    Calendar.jsx           month calendar of deadlines, filtered per person
    CardModal.jsx          deadline, reminder, assignee, status, priority
    BoardsView.jsx         folders and projects
    People.jsx             people per folder and per project, with roles
    InvitePanel.jsx        invite by email, with the send-it-yourself fallback
    FolderMembersModal.jsx a folder's people
    InviteModal.jsx        one project's people
    Meetings.jsx           meeting boards grouped by folder and project
    meeting/Whiteboard.jsx the whiteboard: tools, colours, live sync, undo
    meeting/palette.js     colours, sizes, stroke smoothing and hit testing
    Planner / Inbox / Overview
    Chrome.jsx             top bar, sidebar, mobile menu and nav, toasts
    ui.jsx                 icons, avatars, modal, buttons
supabase/
  migrations/              the schema, including every policy
  functions/invite/        the invitation endpoint
```

State is optimistic: a change lands in the interface immediately and is written
straight after. If the write fails the error is shown and the server's version
is loaded back, so what you see is never a change that did not happen.

### Meeting boards and live editing

Every note, stroke and frame is its own row in `meeting_items`, so two people
writing at once each save their own items rather than overwriting a shared
document. A meeting inherits its project's access through `meeting_role()`, so
viewers can watch a board but not write on it.

Two details keep concurrent editing honest. Writes to a single item are
**queued**: placing a note saves it and typing saves it again a moment later, and
two requests in flight for the same row could otherwise land out of order and
leave the empty version. And the realtime **echo of your own write is ignored**:
by the time it arrives you may have typed more, and applying it would roll the
note back. Deletes are treated the same way, so undoing an erase is not undone by
the echo of the erase.

### Drag and drop

Three things keep dropping reliable: the droppable covers the whole status group
rather than just its rows; collision detection is `pointerWithin`, so the group
under the cursor wins; and droppables re-measure with `MeasuringStrategy.Always`
so rectangles are never stale after the layout shifts. `html { scrollbar-gutter:
stable }` matters too — without it a scrollbar appearing mid-drag resizes the
window, and dnd-kit cancels a drag on resize. Each drop is saved as a single
`reorder_cards` call, so positions are never half-written.

## Notes and limits

- Reminders fire while a tab is open; desktop notifications need permission.
- Email delivery depends on the provider you configure, as above.
- The free Supabase tier pauses a project after a week without requests.
