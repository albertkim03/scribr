-- Report status: 'draft' | 'complete'
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

-- Student avatar
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- AI usage tracking (one row per user per UTC day)
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_ai_usage" ON public.ai_usage
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_ai_usage" ON public.ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_ai_usage" ON public.ai_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Storage bucket for student avatars (public read)
-- NOTE: If this fails (storage extension not enabled), create the bucket manually in
-- the Supabase dashboard: Storage > New bucket > "student-avatars" > Public
INSERT INTO storage.buckets (id, name, public)
  VALUES ('student-avatars', 'student-avatars', true)
  ON CONFLICT DO NOTHING;

CREATE POLICY "anyone_can_read_avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'student-avatars');
CREATE POLICY "auth_can_upload_avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'student-avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth_can_update_avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'student-avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth_can_delete_avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'student-avatars' AND auth.uid() IS NOT NULL);
