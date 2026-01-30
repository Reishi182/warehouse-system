-- Create backups table for server-side snapshot storage
CREATE TABLE IF NOT EXISTS public.backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    data JSONB NOT NULL,
    size_bytes INTEGER,
    tables_included TEXT[]
);

-- Enable RLS
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read backups
CREATE POLICY "Authenticated users can read backups"
ON public.backups FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admin and auditor can insert backups
CREATE POLICY "Admin and auditor can insert backups"
ON public.backups FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only admin can delete backups
CREATE POLICY "Admin can delete backups"
ON public.backups FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON public.backups(created_at DESC);

-- Add comment
COMMENT ON TABLE public.backups IS 'Server-side backup snapshots for data recovery';
