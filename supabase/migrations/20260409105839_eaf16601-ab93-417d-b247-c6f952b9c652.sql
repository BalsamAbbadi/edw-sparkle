
ALTER TABLE public.sessions ADD COLUMN session_notes text DEFAULT '';
ALTER TABLE public.notes ADD COLUMN is_pinned boolean DEFAULT false;
