SELECT polname, qual, with_check FROM pg_policy WHERE polrelid = 'public.stock_requests'::regclass OR polrelid = 'public.stock_returns'::regclass;
