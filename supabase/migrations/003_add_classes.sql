-- Classes (per teacher)
create table public.classes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null,
  unique (user_id, name)
);

alter table public.classes enable row level security;
create policy "select_own_classes" on public.classes for select using (auth.uid() = user_id);
create policy "insert_own_classes" on public.classes for insert with check (auth.uid() = user_id);
create policy "update_own_classes" on public.classes for update using (auth.uid() = user_id);
create policy "delete_own_classes" on public.classes for delete using (auth.uid() = user_id);

-- Extend students with profile notes and optional class
alter table public.students
  add column if not exists profile_notes text not null default '',
  add column if not exists class_id uuid references public.classes(id) on delete set null;
