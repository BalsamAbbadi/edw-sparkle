
-- Attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  student_id UUID NOT NULL,
  course_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_present BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance" ON public.attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attendance" ON public.attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attendance" ON public.attendance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own attendance" ON public.attendance FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_attendance_session ON public.attendance(session_id);
CREATE INDEX idx_attendance_student ON public.attendance(student_id);
CREATE INDEX idx_attendance_course ON public.attendance(course_id);

-- Course new columns
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_type TEXT DEFAULT 'long';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS payment_interval_sessions INTEGER DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Notifications deep link
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link_to TEXT DEFAULT '';
