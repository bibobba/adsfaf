-- EDU.GAME MVP schema
-- Generated for the web version. Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  full_name text not null,
  username text unique,
  role text not null default 'student' check (role in ('student','teacher','moderator')),
  class_id uuid,
  city text,
  bio text,
  avatar_url text,
  theme text not null default 'default',
  frame text,
  background text,
  xp integer not null default 0 check (xp >= 0),
  coins integer not null default 0 check (coins >= 0),
  streak integer not null default 0 check (streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text,
  school_name text,
  moderator_id uuid references public.profiles(id) on delete set null,
  theme text not null default 'default',
  banner_url text,
  total_xp integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles add constraint profiles_class_fk foreign key (class_id) references public.classes(id) on delete set null;

create table if not exists public.tags (id uuid primary key default gen_random_uuid(), name text not null unique);
create table if not exists public.profile_tags (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (profile_id, tag_id)
);
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  owner_id uuid references public.profiles(id) on delete set null, theme text not null default 'default',
  created_at timestamptz not null default now()
);
create table if not exists public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (club_id, profile_id)
);
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  event_type text not null check (event_type in ('class','interclass','tournament','individual')),
  status text not null default 'pending_teacher' check (status in ('draft','pending_teacher','rejected','approved','active','completed','cancelled')),
  creator_id uuid references public.profiles(id) on delete set null,
  teacher_id uuid references public.profiles(id) on delete set null,
  starts_at timestamptz, ends_at timestamptz,
  xp_reward integer not null default 0, coin_reward integer not null default 0,
  cover_url text, theme text not null default 'default', created_at timestamptz not null default now()
);
create table if not exists public.event_classes (
  event_id uuid not null references public.events(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  invitation_status text not null default 'pending' check (invitation_status in ('pending','accepted','declined')),
  primary key (event_id, class_id)
);
create table if not exists public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'joined' check (status in ('invited','joined','declined','completed')),
  joined_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);
create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  uploader_id uuid references public.profiles(id) on delete set null, url text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')), created_at timestamptz not null default now()
);
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(), name text not null, description text, icon text,
  xp_reward integer not null default 0, coin_reward integer not null default 0
);
create table if not exists public.profile_achievements (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (profile_id, achievement_id)
);
create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  item_type text not null check (item_type in ('avatar','frame','background','badge','theme')),
  price integer not null check (price >= 0), asset_url text, active boolean not null default true
);
create table if not exists public.inventory (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.shop_items(id) on delete cascade,
  purchased_at timestamptz not null default now(), primary key (profile_id, item_id)
);
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null, reason text not null, event_id uuid references public.events(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null, reason text not null, event_id uuid references public.events(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(), title text, is_group boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.chat_members (
  chat_id uuid not null references public.chats(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(), primary key (chat_id, profile_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade, body text not null, created_at timestamptz not null default now()
);

create index if not exists profiles_name_idx on public.profiles using gin (to_tsvector('simple', full_name));
create index if not exists events_starts_idx on public.events(starts_at);
create index if not exists messages_chat_created_idx on public.messages(chat_id, created_at);

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.tags enable row level security;
alter table public.profile_tags enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.events enable row level security;
alter table public.event_classes enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_photos enable row level security;
alter table public.achievements enable row level security;
alter table public.profile_achievements enable row level security;
alter table public.shop_items enable row level security;
alter table public.inventory enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;

create policy if not exists "public profiles read" on public.profiles for select using (true);
create policy if not exists "public classes read" on public.classes for select using (true);
create policy if not exists "public tags read" on public.tags for select using (true);
create policy if not exists "public clubs read" on public.clubs for select using (true);
create policy if not exists "public club members read" on public.club_members for select using (true);
create policy if not exists "public events read" on public.events for select using (true);
create policy if not exists "public event classes read" on public.event_classes for select using (true);
create policy if not exists "public event participants read" on public.event_participants for select using (true);
create policy if not exists "public achievements read" on public.achievements for select using (true);
create policy if not exists "public profile achievements read" on public.profile_achievements for select using (true);
create policy if not exists "public shop read" on public.shop_items for select using (active = true);

-- The final role-sensitive write policies will be enabled after MAX/Sferum identity is wired.
