-- Add UPDATE and DELETE policies for sales table to support sale cancellation

-- Allow authenticated users to update their own sales
CREATE POLICY "Users can update their own sales"
ON public.sales
FOR UPDATE
USING (auth.uid() = cashier_id)
WITH CHECK (auth.uid() = cashier_id);

-- Allow admins to update any sales
CREATE POLICY "Admins can update any sales"
ON public.sales
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow users to delete their own sales (same day only is handled by app logic)
CREATE POLICY "Users can delete their own sales"
ON public.sales
FOR DELETE
USING (auth.uid() = cashier_id);

-- Allow admins to delete any sales
CREATE POLICY "Admins can delete any sales"
ON public.sales
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);
