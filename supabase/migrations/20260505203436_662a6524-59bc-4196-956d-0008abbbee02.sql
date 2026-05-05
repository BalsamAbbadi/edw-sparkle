ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS attended boolean;

UPDATE public.attendance
SET attended = COALESCE(attended, is_present, false)
WHERE attended IS NULL OR attended IS DISTINCT FROM COALESCE(is_present, false);

ALTER TABLE public.attendance
ALTER COLUMN attended SET DEFAULT false;

UPDATE public.attendance
SET attended = false
WHERE attended IS NULL;

ALTER TABLE public.attendance
ALTER COLUMN attended SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique
ON public.attendance(session_id, student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_student_course_attended
ON public.attendance(student_id, course_id, attended);

CREATE OR REPLACE FUNCTION public.sync_attendance_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_user_id uuid;
BEGIN
  NEW.attended := COALESCE(NEW.attended, NEW.is_present, false);
  NEW.is_present := NEW.attended;

  SELECT s.course_id, s.user_id
  INTO v_course_id, v_user_id
  FROM public.sessions s
  WHERE s.id = NEW.session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session % not found', NEW.session_id;
  END IF;

  NEW.course_id := v_course_id;
  NEW.user_id := v_user_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.course_id = NEW.course_id
      AND e.student_id = NEW.student_id
  ) THEN
    RAISE EXCEPTION 'Student % is not enrolled in course %', NEW.student_id, NEW.course_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_sync_flags ON public.attendance;
CREATE TRIGGER attendance_sync_flags
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.sync_attendance_flags();

CREATE OR REPLACE FUNCTION public.session_has_ended(_session_date date, _start_time time, _end_time time)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (
    _session_date < CURRENT_DATE
    OR (
      _session_date = CURRENT_DATE
      AND COALESCE(_end_time, _start_time) <= LOCALTIME
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.recalculate_single_payment(_student_id uuid, _course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_payment_type text;
  v_course_total numeric := 0;
  v_price_per_session numeric := 0;
  v_existing_paid numeric := 0;
  v_expected_amount numeric := 0;
  v_remaining_amount numeric := 0;
  v_attended_sessions integer := 0;
  v_is_enrolled boolean := false;
  v_payment_interval integer := 0;
BEGIN
  SELECT c.user_id,
         COALESCE(c.payment_type, 'full'),
         GREATEST(COALESCE(c.fees, 0), 0),
         GREATEST(COALESCE(c.price_per_session, 0), 0),
         GREATEST(COALESCE(c.payment_interval_sessions, 0), 0)
  INTO v_user_id, v_payment_type, v_course_total, v_price_per_session, v_payment_interval
  FROM public.courses c
  WHERE c.id = _course_id;

  IF NOT FOUND THEN
    DELETE FROM public.payments
    WHERE student_id = _student_id AND course_id = _course_id;
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.enrollments e
    WHERE e.student_id = _student_id
      AND e.course_id = _course_id
  ) INTO v_is_enrolled;

  IF NOT v_is_enrolled THEN
    DELETE FROM public.payments
    WHERE student_id = _student_id AND course_id = _course_id;
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_attended_sessions
  FROM public.attendance a
  JOIN public.sessions s ON s.id = a.session_id
  WHERE a.student_id = _student_id
    AND a.course_id = _course_id
    AND a.attended = true
    AND public.session_has_ended(s.session_date, s.start_time, s.end_time);

  IF v_payment_type = 'per_session' THEN
    v_expected_amount := GREATEST(v_attended_sessions * v_price_per_session, 0);
  ELSE
    v_expected_amount := GREATEST(v_course_total, 0);
  END IF;

  SELECT COALESCE(p.amount_paid, 0)
  INTO v_existing_paid
  FROM public.payments p
  WHERE p.student_id = _student_id
    AND p.course_id = _course_id
  LIMIT 1;

  v_existing_paid := GREATEST(COALESCE(v_existing_paid, 0), 0);
  v_remaining_amount := GREATEST(v_expected_amount - v_existing_paid, 0);

  INSERT INTO public.payments (
    student_id,
    course_id,
    user_id,
    amount_paid,
    expected_amount,
    total_amount,
    remaining_amount,
    attended_sessions_count,
    due_date
  ) VALUES (
    _student_id,
    _course_id,
    v_user_id,
    v_existing_paid,
    v_expected_amount,
    v_expected_amount,
    v_remaining_amount,
    v_attended_sessions,
    CASE
      WHEN v_remaining_amount <= 0 THEN NULL
      WHEN v_payment_type = 'per_session' AND v_attended_sessions = 0 THEN NULL
      WHEN v_payment_interval > 0 AND v_payment_type = 'per_session' AND MOD(v_attended_sessions, v_payment_interval) <> 0 THEN NULL
      ELSE CURRENT_DATE
    END
  )
  ON CONFLICT (student_id, course_id)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    expected_amount = EXCLUDED.expected_amount,
    total_amount = EXCLUDED.total_amount,
    attended_sessions_count = EXCLUDED.attended_sessions_count,
    remaining_amount = GREATEST(EXCLUDED.expected_amount - public.payments.amount_paid, 0),
    due_date = CASE
      WHEN GREATEST(EXCLUDED.expected_amount - public.payments.amount_paid, 0) <= 0 THEN NULL
      WHEN v_payment_type = 'per_session' AND EXCLUDED.attended_sessions_count = 0 THEN NULL
      WHEN v_payment_interval > 0 AND v_payment_type = 'per_session' AND MOD(EXCLUDED.attended_sessions_count, v_payment_interval) <> 0 THEN NULL
      ELSE CURRENT_DATE
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_course_payments(_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT e.student_id
    FROM public.enrollments e
    WHERE e.course_id = _course_id
  LOOP
    PERFORM public.recalculate_single_payment(rec.student_id, _course_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_attendance_payment_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_single_payment(OLD.student_id, OLD.course_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND (OLD.student_id <> NEW.student_id OR OLD.course_id <> NEW.course_id) THEN
    PERFORM public.recalculate_single_payment(OLD.student_id, OLD.course_id);
  END IF;

  PERFORM public.recalculate_single_payment(NEW.student_id, NEW.course_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_sync_payment ON public.attendance;
CREATE TRIGGER attendance_sync_payment
AFTER INSERT OR UPDATE OR DELETE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.handle_attendance_payment_sync();

CREATE OR REPLACE FUNCTION public.handle_course_payment_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.id <> NEW.id THEN
    PERFORM public.recalculate_course_payments(OLD.id);
  END IF;

  PERFORM public.recalculate_course_payments(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_sync_payments ON public.courses;
CREATE TRIGGER courses_sync_payments
AFTER INSERT OR UPDATE OF fees, payment_type, price_per_session, payment_interval_sessions, is_archived ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.handle_course_payment_sync();

CREATE OR REPLACE FUNCTION public.handle_session_payment_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_course_payments(OLD.course_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.course_id <> NEW.course_id THEN
    PERFORM public.recalculate_course_payments(OLD.course_id);
  END IF;

  PERFORM public.recalculate_course_payments(NEW.course_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_sync_payments ON public.sessions;
CREATE TRIGGER sessions_sync_payments
AFTER INSERT OR UPDATE OF course_id, session_date, start_time, end_time OR DELETE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.handle_session_payment_sync();

CREATE OR REPLACE FUNCTION public.handle_enrollment_payment_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.attendance
    WHERE student_id = OLD.student_id
      AND course_id = OLD.course_id;

    DELETE FROM public.payments
    WHERE student_id = OLD.student_id
      AND course_id = OLD.course_id;

    RETURN OLD;
  END IF;

  PERFORM public.recalculate_single_payment(NEW.student_id, NEW.course_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enrollments_sync_payments ON public.enrollments;
CREATE TRIGGER enrollments_sync_payments
AFTER INSERT OR DELETE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.handle_enrollment_payment_sync();

CREATE OR REPLACE FUNCTION public.sync_payment_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name text;
  v_course_title text;
  v_type text;
  v_message text;
  v_link text;
BEGIN
  v_link := '/students/' || NEW.student_id;

  DELETE FROM public.notifications
  WHERE user_id = NEW.user_id
    AND link_to = v_link
    AND type IN ('payment_due', 'payment_late');

  IF COALESCE(NEW.remaining_amount, 0) <= 0 OR NEW.status = 'full' THEN
    RETURN NEW;
  END IF;

  SELECT s.name INTO v_student_name FROM public.students s WHERE s.id = NEW.student_id;
  SELECT c.title INTO v_course_title FROM public.courses c WHERE c.id = NEW.course_id;

  IF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    v_type := 'payment_late';
    v_message := COALESCE('دفعة متأخرة للطالب ' || COALESCE(v_student_name, '') || ' في دورة ' || COALESCE(v_course_title, ''), 'دفعة متأخرة');
  ELSIF NEW.due_date IS NOT NULL THEN
    v_type := 'payment_due';
    v_message := COALESCE('يوجد استحقاق دفع للطالب ' || COALESCE(v_student_name, '') || ' في دورة ' || COALESCE(v_course_title, ''), 'يوجد استحقاق دفع');
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, link_to)
  VALUES (NEW.user_id, v_type, v_message, v_link);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_sync_notifications ON public.payments;
CREATE TRIGGER payments_sync_notifications
AFTER INSERT OR UPDATE OF due_date, status, remaining_amount, expected_amount, amount_paid ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_notifications();

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT DISTINCT e.student_id, e.course_id
    FROM public.enrollments e
  LOOP
    PERFORM public.recalculate_single_payment(rec.student_id, rec.course_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_attendance_flags() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.session_has_ended(date, time, time) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_single_payment(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_course_payments(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_attendance_payment_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_course_payment_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_session_payment_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_enrollment_payment_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_payment_notifications() FROM PUBLIC, anon, authenticated;