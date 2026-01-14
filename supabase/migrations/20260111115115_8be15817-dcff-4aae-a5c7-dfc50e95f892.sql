-- Fix permissive RLS policy for notifications INSERT
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Only authenticated users or system can insert notifications
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);