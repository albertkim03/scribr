-- Rename 'General Classroom' to 'General' for existing users
update public.subjects set name = 'General' where name = 'General Classroom';

-- Update seed function so future signups get 'General' instead
create or replace function public.handle_new_user_subjects()
returns trigger as $$
begin
  insert into public.subjects (user_id, name) values
    (new.id, 'General'),
    (new.id, 'English'),
    (new.id, 'Maths'),
    (new.id, 'Biology'),
    (new.id, 'History');
  return new;
end;
$$ language plpgsql security definer;
