# Backend

The SQL in `migrations/` is the schema that the hosted project already runs. It
is kept here so the database can be rebuilt from scratch, reviewed, or pointed
at a second project (staging, a fork, a new client).

Applying it to a fresh project, in order:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
supabase functions deploy invite
```

Then add your own address to the `admins` table:

```sql
insert into public.admins (email) values ('you@example.com');
```

`functions/invite/index.ts` is the invitation endpoint. It writes the membership
through the caller's own token, so row level security still decides who may
invite, and it sends the notification email only when `RESEND_API_KEY` is set.
