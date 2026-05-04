ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'full',
ADD COLUMN IF NOT EXISTS price_per_session numeric NOT NULL DEFAULT 0;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS expected_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS attended_sessions_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_student_course_unique
ON public.payments(student_id, course_id);

CREATE INDEX IF NOT EXISTS idx_payments_course_student
ON public.payments(course_id, student_id);

CREATE INDEX IF NOT EXISTS idx_sessions_course_date_time
ON public.sessions(course_id, session_date, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_attendance_student_course_present
ON public.attendance(student_id, course_id, is_present);

DROP TRIGGER IF EXISTS payments_calc_status ON public.payments;
DROP TRIGGER IF EXISTS calculate_payment_status_trigger ON public.payments;

CREATE OR REPLACE FUNCTION public.calculate_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.amount_paid := GREATEST(COALESCE(NEW.amount_paid, 0), 0);
  NEW.expected_amount := GREATEST(COALESCE(NEW.expected_amount, NEW.total_amount, 0), 0);
  NEW.total_amount := NEW.expected_amount;
  NEW.remaining_amount := GREATEST(NEW.expected_amount - NEW.amount_paid, 0);

  IF NEW.amount_paid = 0 THEN
    NEW.status := 'unpaid';
  ELSIF NEW.amount_paid < NEW.expected_amount THEN
    NEW.status := 'partial';
  ELSE
    NEW.status := 'full';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER payments_calc_status
BEFORE INSERT OR UPDATE OF amount_paid, expected_amount, total_amount ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.calculate_payment_status();

CREATE OR REPLACE FUNCTION public.recalculate_single_payment(_student_id uuid, _course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_payment_type text;
  v_course_total numeric;
  v_price_per_session numeric;
  v_expected_amount numeric := 0;
  v_attended_sessions integer := 0;
  v_amount_paid numeric := 0;
  v_is_enrolled boolean := false;
BEGIN
  SELECT c.user_id,
         COALESCE(c.payment_type, 'full'),
         GREATEST(COALESCE(c.fees, 0), 0),
         GREATEST(COALESCE(c.price_per_session, 0), 0)
  INTO v_user_id, v_payment_type, v_course_total, v_price_per_session
  FROM public.courses c
  WHERE c.id = _course_id;

  IF NOT FOUND THEN
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
    WHERE student_id = _student_id
      AND course_id = _course_id;
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_attended_sessions
  FROM public.attendance a
  JOIN public.sessions s ON s.id = a.session_id
  WHERE a.student_id = _student_id
    AND a.course_id = _course_id
    AND a.is_present = true
    AND (
      s.session_date < CURRENT_DATE
      OR (
        s.session_date = CURRENT_DATE
        AND COALESCE(s.end_time, s.start_time) <= LOCALTIME
      )
    );

  IF v_payment_type = 'per_session' THEN
    v_expected_amount := v_attended_sessions * v_price_per_session;
  ELSE
    v_expected_amount := v_course_total;
  END IF;

  SELECT COALESCE(amount_paid, 0)
  INTO v_amount_paid
  FROM public.payments
  WHERE student_id = _student_id
    AND course_id = _course_id
  LIMIT 1;

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
    COALESCE(v_amount_paid, 0),
    v_expected_amount,
    v_expected_amount,
    GREATEST(v_expected_amount - COALESCE(v_amount_paid, 0), 0),
    v_attended_sessions,
    CASE
      WHEN v_expected_amount > COALESCE(v_amount_paid, 0) THEN CURRENT_DATE
      ELSE NULL
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
      WHEN EXCLUDED.expected_amount > public.payments.amount_paid THEN CURRENT_DATE
      ELSE NULL
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

DROP TRIGGER IF EXISTS attendance_sync_payment ON public.attendance;
DROP FUNCTION IF EXISTS public.sync_payment_due_on_attendance();

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
  PERFORM public.recalculate_course_payments(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_sync_payments ON public.courses;
CREATE TRIGGER courses_sync_payments
AFTER INSERT OR UPDATE OF fees, payment_type, price_per_session, is_archived ON public.courses
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

DO $$
DECLARE
  rec record;
BEGIN
  UPDATE public.courses
  SET payment_type = COALESCE(NULLIF(payment_type, ''), 'full'),
      price_per_session = GREATEST(COALESCE(price_per_session, 0), 0);

  UPDATE public.payments
  SET expected_amount = GREATEST(COALESCE(expected_amount, total_amount, 0), 0),
      total_amount = GREATEST(COALESCE(expected_amount, total_amount, 0), 0),
      remaining_amount = GREATEST(COALESCE(expected_amount, total_amount, 0) - COALESCE(amount_paid, 0), 0),
      attended_sessions_count = GREATEST(COALESCE(attended_sessions_count, 0), 0);

  FOR rec IN
    SELECT DISTINCT e.student_id, e.course_id
    FROM public.enrollments e
  LOOP
    PERFORM public.recalculate_single_payment(rec.student_id, rec.course_id);
  END LOOP;
END;
$$;