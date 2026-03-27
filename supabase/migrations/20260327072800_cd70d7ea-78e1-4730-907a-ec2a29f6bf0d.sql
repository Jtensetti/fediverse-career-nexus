
-- Deny all direct client SELECT access to password_reset_codes
CREATE POLICY "No direct access to password reset codes"
  ON public.password_reset_codes
  FOR SELECT
  TO public
  USING (false);
