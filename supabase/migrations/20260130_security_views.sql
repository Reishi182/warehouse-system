-- ===========================================
-- SECURITY VIEWS AND AUDIT LOGGING
-- ===========================================
-- This migration creates secure views and audit logging
-- for security monitoring via DevTools Network inspection

-- =====================
-- 1. SECURITY AUDIT LOG TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_security_audit_created 
ON security_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_user 
ON security_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_security_audit_action 
ON security_audit_log(action);

-- Enable RLS
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins read audit logs" ON security_audit_log
FOR SELECT USING (
  get_user_role() = 'admin'
);

-- Everyone can insert (for logging from client)
CREATE POLICY "Insert audit logs" ON security_audit_log
FOR INSERT WITH CHECK (true);

-- No one can update or delete audit logs
CREATE POLICY "No audit log updates" ON security_audit_log
FOR UPDATE USING (false);

CREATE POLICY "No audit log deletes" ON security_audit_log
FOR DELETE USING (false);

-- =====================
-- 2. SAFE PROFILE VIEW (EXCLUDES SENSITIVE DATA)
-- =====================

CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT 
  id,
  user_id,
  name,
  role,
  avatar,
  created_at
FROM profiles;

-- =====================
-- 3. FUNCTION TO LOG SECURITY EVENTS
-- =====================

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_user_role TEXT;
  v_log_id UUID;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  
  SELECT name, role INTO v_user_name, v_user_role
  FROM profiles
  WHERE user_id = v_user_id;
  
  -- Insert log entry
  INSERT INTO security_audit_log (
    user_id,
    user_name,
    user_role,
    action,
    entity_type,
    entity_id,
    metadata,
    success,
    error_message
  ) VALUES (
    v_user_id,
    v_user_name,
    v_user_role,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata,
    p_success,
    p_error_message
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- =====================
-- 4. TRIGGER FOR SENSITIVE OPERATIONS
-- =====================

-- Log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM log_security_event(
      'role_change',
      'profiles',
      NEW.user_id::TEXT,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_role_change ON profiles;

CREATE TRIGGER trigger_log_role_change
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION log_role_change();

-- Log backup restores
CREATE OR REPLACE FUNCTION public.log_backup_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_security_event(
      'backup_created',
      'backups',
      NEW.id::TEXT,
      jsonb_build_object('name', NEW.name)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_security_event(
      'backup_deleted',
      'backups',
      OLD.id::TEXT,
      jsonb_build_object('name', OLD.name)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_backup ON backups;

CREATE TRIGGER trigger_log_backup
AFTER INSERT OR DELETE ON backups
FOR EACH ROW
EXECUTE FUNCTION log_backup_activity();

-- =====================
-- 5. FAILED LOGIN TRACKING (for rate limiting)
-- =====================

CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_login_email 
ON failed_login_attempts(email, attempted_at DESC);

-- Auto-cleanup old entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_failed_logins()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM failed_login_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
$$;

-- Enable RLS
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service only failed logins" ON failed_login_attempts
FOR ALL USING (false);
