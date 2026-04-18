-- Drop existing text check constraint
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_gender_check;

-- Convert gender column from TEXT to INT2
-- Male = 0, Female = 1, Other = 2, Prefer not to say = 3
ALTER TABLE students
  ALTER COLUMN gender TYPE INT2
  USING CASE gender
    WHEN 'Male'              THEN 0
    WHEN 'Female'            THEN 1
    WHEN 'Other'             THEN 2
    WHEN 'Prefer not to say' THEN 3
    ELSE 0
  END;

-- Add new integer range constraint
ALTER TABLE students
  ADD CONSTRAINT students_gender_range CHECK (gender IN (0, 1, 2, 3));
