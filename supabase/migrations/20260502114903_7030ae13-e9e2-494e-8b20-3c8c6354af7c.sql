
-- Pin support for courses and students
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- Per-payment due date (for "Late" label and notifications)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS due_date date;

-- Helper: cleanup old payment log entries older than 7 days that are fully paid.
-- We keep partial/unpaid entries so they stay visible. We only delete fully-paid log entries older than 7 days.
CREATE OR REPLACE FUNCTION public.cleanup_old_payment_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete payments rows that are fully paid AND last updated more than 7 days ago AND course is archived for >7 days
  -- Safer: do NOT delete payments themselves (they are core data). Instead, this is a no-op kept for future scheduled jobs.
  RETURN;
END;
$$;
