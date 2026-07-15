# Pocket Watch — Setup & Deploy

Everything's written. Here's the only manual work left, in order.

## 1. Set up the database (5 min)

1. Go to your Supabase project → **SQL Editor** (in the sidebar menu)
2. Click **New query**
3. Open `supabase-schema.sql` from this folder, copy the whole thing, paste it in
4. Click **Run**

This creates every table (profiles, posts, reels, comments, likes, invites, access requests), the security rules that keep private profiles private, and the storage buckets for photos/videos/reels.

## 2. Turn off "Confirm email" (optional, speeds up testing)

By default Supabase requires email confirmation before login works. For faster testing:
- Supabase → **Authentication** → **Providers** → **Email** → toggle off "Confirm email"
- (You can turn this back on later once you're ready for real invites)

## 3. Create your first invite code (so someone can actually get in)

In Supabase → **SQL Editor**, run this (swap in your own info):

```sql
insert into invites (code, created_by)
values ('WELCOME1', null);
```

(We'll wire up a nicer "generate invite" button inside the app itself in the next pass — this is just to get you testing today.)

## 4. Push this project to GitHub

If you don't already have a GitHub account: [github.com](https://github.com) → sign up (free).

Then, from a computer (not phone, this part needs a real terminal):
```
cd pocketwatch
git init
git add .
git commit -m "Pocket Watch v1"
```
Create a new repo on GitHub, then follow GitHub's instructions to push (`git remote add origin ...`, `git push`).

## 5. Deploy to Vercel

1. [vercel.com](https://vercel.com) → sign in with GitHub
2. **Add New Project** → import your `pocketwatch` repo
3. Before clicking deploy, add **Environment Variables**:
   - `VITE_SUPABASE_URL` → `https://zqguevrwialzdlopnkpd.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` → `sb_publishable_QDJYz2wdh1-iglWyN0JXbw_85J0iaOO`
4. Click **Deploy**

You'll get a live link like `pocketwatch.vercel.app` within a minute or two.

## 6. Install it on your phone

Open that link on your phone's browser → tap **Add to Home Screen**. It'll sit on your phone like a real app.

## 7. Try it

- Go to the login screen, enter your email + the invite code `WELCOME1`
- Check your email for the sign-in link
- You're in — post something, check the feed

---

## What's real right now
- Real accounts (magic link login)
- Real invite-code gating
- Real posts saved to your database, visible to everyone signed in
- Real profiles, auto-created on signup

## What's still mock / not wired yet
- Photo/video upload (buckets exist, upload button isn't connected yet)
- Reels creation (viewing works, posting doesn't yet)
- Creator tools, Groups
- The in-app "generate invite code" button (for now, invite codes are made manually in Supabase's SQL editor)

Bring me back here once you've got it deployed and I'll wire up photo/video upload next — that's the natural next step.
