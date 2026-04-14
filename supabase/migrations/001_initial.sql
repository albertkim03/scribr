-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Students
create table public.students (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  gender text not null check (gender in ('Male', 'Female', 'Other', 'Prefer not to say')),
  created_at timestamptz default now() not null
);

-- Subjects (per teacher)
create table public.subjects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null,
  unique (user_id, name)
);

-- Events
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete set null,
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative')),
  description text not null,
  created_at timestamptz default now() not null
);

-- Reports (one per student)
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  generated_at timestamptz default now() not null,
  last_edited_at timestamptz default now() not null,
  unique (student_id)
);

-- Row Level Security
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.events enable row level security;
alter table public.reports enable row level security;

-- Students policies
create policy "select_own_students" on public.students for select using (auth.uid() = user_id);
create policy "insert_own_students" on public.students for insert with check (auth.uid() = user_id);
create policy "update_own_students" on public.students for update using (auth.uid() = user_id);
create policy "delete_own_students" on public.students for delete using (auth.uid() = user_id);

-- Subjects policies
create policy "select_own_subjects" on public.subjects for select using (auth.uid() = user_id);
create policy "insert_own_subjects" on public.subjects for insert with check (auth.uid() = user_id);
create policy "update_own_subjects" on public.subjects for update using (auth.uid() = user_id);
create policy "delete_own_subjects" on public.subjects for delete using (auth.uid() = user_id);

-- Events policies
create policy "select_own_events" on public.events for select using (auth.uid() = user_id);
create policy "insert_own_events" on public.events for insert with check (auth.uid() = user_id);
create policy "update_own_events" on public.events for update using (auth.uid() = user_id);
create policy "delete_own_events" on public.events for delete using (auth.uid() = user_id);

-- Reports policies
create policy "select_own_reports" on public.reports for select using (auth.uid() = user_id);
create policy "insert_own_reports" on public.reports for insert with check (auth.uid() = user_id);
create policy "update_own_reports" on public.reports for update using (auth.uid() = user_id);
create policy "delete_own_reports" on public.reports for delete using (auth.uid() = user_id);

-- Auto-seed default subjects when a new user signs up
create or replace function public.handle_new_user_subjects()
returns trigger as $$
begin
  insert into public.subjects (user_id, name) values
    (new.id, 'English'),
    (new.id, 'Maths'),
    (new.id, 'Biology'),
    (new.id, 'History'),
    (new.id, 'General Classroom');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_subjects
  after insert on auth.users
  for each row execute procedure public.handle_new_user_subjects();
