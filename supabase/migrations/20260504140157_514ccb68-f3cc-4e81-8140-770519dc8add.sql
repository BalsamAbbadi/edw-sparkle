REVOKE ALL ON FUNCTION public.handle_attendance_payment_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_course_payment_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_enrollment_payment_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_session_payment_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_course_payments(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_single_payment(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;