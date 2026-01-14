-- Create users/profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'warehouse' CHECK (role IN ('warehouse', 'cashier', 'auditor', 'admin')),
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  stock_gudang INTEGER NOT NULL DEFAULT 0,
  stock_toko INTEGER NOT NULL DEFAULT 0,
  stock_lainnya INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_out_requests table
CREATE TABLE public.stock_out_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  from_location TEXT NOT NULL CHECK (from_location IN ('gudang', 'toko', 'lainnya')),
  to_location TEXT NOT NULL CHECK (to_location IN ('gudang', 'toko', 'lainnya')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  surat_jalan_id UUID,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT
);

-- Create surat_jalan table
CREATE TABLE public.surat_jalan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT
);

-- Create surat_jalan_items table
CREATE TABLE public.surat_jalan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  surat_jalan_id UUID NOT NULL REFERENCES public.surat_jalan(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  barcode TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  from_location TEXT NOT NULL CHECK (from_location IN ('gudang', 'toko', 'lainnya')),
  to_location TEXT NOT NULL CHECK (to_location IN ('gudang', 'toko', 'lainnya'))
);

-- Add foreign key to stock_out_requests for surat_jalan
ALTER TABLE public.stock_out_requests 
ADD CONSTRAINT fk_surat_jalan 
FOREIGN KEY (surat_jalan_id) REFERENCES public.surat_jalan(id);

-- Create stock_logs table
CREATE TABLE public.stock_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  location TEXT NOT NULL CHECK (location IN ('gudang', 'toko', 'lainnya')),
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  note TEXT
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  link TEXT
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_out_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_jalan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_jalan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for products - ALL authenticated users can view
CREATE POLICY "All authenticated users can view products" ON public.products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Warehouse and admin can insert products" ON public.products FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Warehouse and admin can update products" ON public.products FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policies for stock_out_requests
CREATE POLICY "All authenticated users can view requests" ON public.stock_out_requests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create requests" ON public.stock_out_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update requests" ON public.stock_out_requests FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policies for surat_jalan
CREATE POLICY "All authenticated users can view surat jalan" ON public.surat_jalan FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Cashier can create surat jalan" ON public.surat_jalan FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auditor can update surat jalan" ON public.surat_jalan FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policies for surat_jalan_items
CREATE POLICY "All authenticated users can view surat jalan items" ON public.surat_jalan_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert surat jalan items" ON public.surat_jalan_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for stock_logs
CREATE POLICY "All authenticated users can view stock logs" ON public.stock_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert stock logs" ON public.stock_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'warehouse')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-creating profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();