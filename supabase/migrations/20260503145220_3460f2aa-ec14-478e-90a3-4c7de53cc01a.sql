-- 1) Bind the existing calculate_payment_status to payments so amount_paid -> status auto-syncs
DROP TRIGGER IF EXISTS payments_calc_status ON public.payments;
CREATE TRIGGER payments_calc_status
BEFORE INSERT OR UPDATE OF amount_paid, total_amount ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.calculate_payment_status();

-- Backfill status for existing rows
UPDATE public.payments
SET amount_paid = amount_paid; -- triggers recompute

-- 2) Updated_at triggers everywhere
DROP TRIGGER IF EXISTS payments_set_updated_at ON public.payments;
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS sessions_set_updated_at ON public.sessions;
CREATE TRIGGER sessions_set_updated_at BEFORE UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS students_set_updated_at ON public.students;
CREATE TRIGGER students_set_updated_at BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS courses_set_updated_at ON public.courses;
CREATE TRIGGER courses_set_updated_at BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Attendance -> sync payment due_date based on payment_interval_sessions
CREATE OR REPLACE FUNCTION public.sync_payment_due_on_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attended_count int;
  interval_sessions int;
  pay_id uuid;
  pay_amount numeric;
  pay_total numeric;
  s_id uuid;
  c_id uuid;
BEGIN
  s_id := COALESCE(NEW.student_id, OLD.student_id);
  c_id := COALESCE(NEW.course_id, OLD.course_id);

  SELECT payment_interval_sessions INTO interval_sessions
  FROM public.courses WHERE id = c_id;

  IF interval_sessions IS NULL OR interval_sessions <= 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*) INTO attended_count
  FROM public.attendance
  WHERE student_id = s_id AND course_id = c_id AND is_present = true;

  SELECT id, amount_paid, total_amount INTO pay_id, pay_amount, pay_total
  FROM public.payments
  WHERE student_id = s_id AND course_id = c_id
  LIMIT 1;

  IF pay_id IS NOT NULL AND attended_count >= interval_sessions AND pay_amount < pay_total THEN
    UPDATE public.payments
    SET due_date = CURRENT_DATE
    WHERE id = pay_id AND (due_date IS NULL OR due_date > CURRENT_DATE);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS attendance_sync_payment ON public.attendance;
CREATE TRIGGER attendance_sync_payment
AFTER INSERT OR UPDATE OR DELETE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_due_on_attendance();

-- 4) Helpful indexes for attendance lookups
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON public.attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course ON public.attendance(course_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique ON public.attendance(session_id, student_id);