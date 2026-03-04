-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Trigger to safely create a profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Chats Table
create table public.chats (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  slider_config jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chats enable row level security;
create policy "Users can CRUD own chats" on chats for all using (auth.uid() = user_id);

-- 3. Messages Table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  role text not null check (role in ('user', 'model')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;
create policy "Users can view messages of their chats" on messages for select using (
  exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
);
create policy "Users can insert messages to their chats" on messages for insert with check (
  exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
);

-- 4. Evaluations Table
create table public.evaluations (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  prof_score integer not null,
  rat_score integer not null,
  pol_score integer not null,
  fun_score integer not null,
  sly_score integer not null,
  critique text not null,
  rewrite text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.evaluations enable row level security;
create policy "Users can view own evaluations" on evaluations for select using (auth.uid() = user_id);
create policy "Users can insert own evaluations" on evaluations for insert with check (auth.uid() = user_id);

-- 5. User Stats Cache Table (Acts as Materialized View but real-time via trigger)
create table public.user_stats_cache (
  user_id uuid references public.profiles(id) on delete cascade not null primary key,
  avg_prof numeric(5,2) default 0,
  avg_rat numeric(5,2) default 0,
  avg_pol numeric(5,2) default 0,
  avg_fun numeric(5,2) default 0,
  avg_sly numeric(5,2) default 0,
  total_evaluations integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_stats_cache enable row level security;
create policy "Users can view own stats cache" on public.user_stats_cache for select using (auth.uid() = user_id);

-- 6. Trigger to Update User Stats Cache on Evaluation Insert
create or replace function public.update_user_stats()
returns trigger as $$
begin
  insert into public.user_stats_cache (
    user_id, avg_prof, avg_rat, avg_pol, avg_fun, avg_sly, total_evaluations, updated_at
  )
  values (
    new.user_id, 
    new.prof_score, 
    new.rat_score, 
    new.pol_score, 
    new.fun_score, 
    new.sly_score, 
    1, 
    now()
  )
  on conflict (user_id) do update set
    avg_prof = ((user_stats_cache.avg_prof * user_stats_cache.total_evaluations) + new.prof_score) / (user_stats_cache.total_evaluations + 1),
    avg_rat = ((user_stats_cache.avg_rat * user_stats_cache.total_evaluations) + new.rat_score) / (user_stats_cache.total_evaluations + 1),
    avg_pol = ((user_stats_cache.avg_pol * user_stats_cache.total_evaluations) + new.pol_score) / (user_stats_cache.total_evaluations + 1),
    avg_fun = ((user_stats_cache.avg_fun * user_stats_cache.total_evaluations) + new.fun_score) / (user_stats_cache.total_evaluations + 1),
    avg_sly = ((user_stats_cache.avg_sly * user_stats_cache.total_evaluations) + new.sly_score) / (user_stats_cache.total_evaluations + 1),
    total_evaluations = user_stats_cache.total_evaluations + 1,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger on_evaluation_inserted
  after insert on public.evaluations
  for each row execute procedure public.update_user_stats();
