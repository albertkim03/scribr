-- Migrate sentiment column from TEXT to INT2
-- Mapping: 0 = negative, 1 = neutral, 2 = positive

-- 1. Drop the old text-based check constraint first
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_sentiment_check;

-- 2. Convert the column type, mapping strings to integers
ALTER TABLE events
  ALTER COLUMN sentiment TYPE INT2
  USING CASE sentiment
    WHEN 'positive' THEN 2
    WHEN 'neutral'  THEN 1
    WHEN 'negative' THEN 0
    ELSE 1
  END;

-- 3. Add the new integer check constraint
ALTER TABLE events
  ADD CONSTRAINT events_sentiment_range CHECK (sentiment IN (0, 1, 2));
