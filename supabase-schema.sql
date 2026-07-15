-- Pocket Watch — Database Schema
-- Paste this whole file into Supabase: SQL Editor (left sidebar) → New Query → paste → Run

-- ============================================
-- PROFILES (extends built-in auth.users)
-- ============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  is_private boolean default true,
  is_creator boolean default false,
  invited_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by logged in users"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- ============================================
-- INVITES
-- ============================================
create table invites (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  created_by uuid references profiles(id),
  used_by uuid references profiles(id),
  expires_at timestamp with time zone default (now() + interval '14 days'),
  created_at timestamp with time zone default now()
);

alter table invites enable row level security;

create policy "Users can view their own invites"
  on invites for select
  using (auth.uid() = created_by);

create policy "Users can create invites"
  on invites for insert
  with check (auth.uid() = created_by);

-- ============================================
-- ACCESS REQUESTS (for the "apply for approval" path)
-- ============================================
create table access_requests (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  name text,
  reason text,
  status text default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamp with time zone default now()
);

alter table access_requests enable row level security;

create policy "Anyone can submit an access request"
  on access_requests for insert
  with check (true);

-- ============================================
-- POSTS
-- ============================================
create table posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references profiles(id) not null,
  post_type text not null check (post_type in ('text', 'photo', 'video', 'link', 'poll')),
  content text,
  media_url text,
  link_url text,
  link_label text,
  group_id uuid,
  created_at timestamp with time zone default now()
);

alter table posts enable row level security;

create policy "Posts are viewable by logged in users"
  on posts for select
  using (auth.role() = 'authenticated');

create policy "Users can create their own posts"
  on posts for insert
  with check (auth.uid() = author_id);

create policy "Users can delete their own posts"
  on posts for delete
  using (auth.uid() = author_id);

-- ============================================
-- REELS (separate table so the feed and reels tab stay fast/independent)
-- ============================================
create table reels (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references profiles(id) not null,
  caption text,
  video_url text not null,
  duration_seconds int check (duration_seconds <= 90),
  created_at timestamp with time zone default now()
);

alter table reels enable row level security;

create policy "Reels are viewable by logged in users"
  on reels for select
  using (auth.role() = 'authenticated');

create policy "Users can create their own reels"
  on reels for insert
  with check (auth.uid() = author_id);

-- ============================================
-- COMMENTS
-- ============================================
create table comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade,
  reel_id uuid references reels(id) on delete cascade,
  author_id uuid references profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table comments enable row level security;

create policy "Comments are viewable by logged in users"
  on comments for select
  using (auth.role() = 'authenticated');

create policy "Users can create comments"
  on comments for insert
  with check (auth.uid() = author_id);

-- ============================================
-- LIKES
-- ============================================
create table likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade,
  reel_id uuid references reels(id) on delete cascade,
  user_id uuid references profiles(id) not null,
  created_at timestamp with time zone default now(),
  unique(post_id, user_id),
  unique(reel_id, user_id)
);

alter table likes enable row level security;

create policy "Likes are viewable by logged in users"
  on likes for select
  using (auth.role() = 'authenticated');

create policy "Users can like things"
  on likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike things"
  on likes for delete
  using (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS (photos, videos, reels)
-- ============================================
insert into storage.buckets (id, name, public)
values
  ('photos', 'photos', true),
  ('videos', 'videos', true),
  ('reels', 'reels', true),
  ('avatars', 'avatars', true);

create policy "Authenticated users can upload photos"
  on storage.objects for insert
  with check (bucket_id = 'photos' and auth.role() = 'authenticated');

create policy "Authenticated users can upload videos"
  on storage.objects for insert
  with check (bucket_id = 'videos' and auth.role() = 'authenticated');

create policy "Authenticated users can upload reels"
  on storage.objects for insert
  with check (bucket_id = 'reels' and auth.role() = 'authenticated');

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Anyone can view media"
  on storage.objects for select
  using (bucket_id in ('photos', 'videos', 'reels', 'avatars'));

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
