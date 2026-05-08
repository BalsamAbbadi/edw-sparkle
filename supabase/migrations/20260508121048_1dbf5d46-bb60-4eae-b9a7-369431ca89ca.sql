CREATE OR REPLACE FUNCTION public.recalculate_single_payment(_student_id uuid, _course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
         CASE
           WHEN c.payment_type = 'per_session' THEN 'per_session'
           ELSE 'full'
         END,
         GREATEST(COALESCE(c.fees, 0), 0),
         GREATEST(COALESCE(c.price_per_session, 0), 0),
         GREATEST(COALESCE(c.payment_interval_sessions, 0), 0)
  INTO v_user_id, v_payment_type, v_course_total, v_price_per_session, v_payment_interval
  FROM public.courses c
  WHERE c.id = _course_id;

  IF NOT FOUND THEN
    DELETE FROM public.payments
    WHERE student_id = _student_id
      AND course_id = _course_id;
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
      WHEN v_payment_type = 'full' THEN CURRENT_DATE
      WHEN v_attended_sessions = 0 THEN NULL
      WHEN v_payment_interval > 0 AND MOD(v_attended_sessions, v_payment_interval) <> 0 THEN NULL
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
      WHEN v_payment_type = 'full' THEN CURRENT_DATE
      WHEN EXCLUDED.attended_sessions_count = 0 THEN NULL
      WHEN v_payment_interval > 0 AND MOD(EXCLUDED.attended_sessions_count, v_payment_interval) <> 0 THEN NULL
      ELSE CURRENT_DATE
    END;
END;
$function$;

ALTER TABLE public.courses
DROP CONSTRAINT IF EXISTS courses_payment_type_check;

ALTER TABLE public.courses
ADD CONSTRAINT courses_payment_type_check
CHECK (payment_type IN ('full', 'per_session'));