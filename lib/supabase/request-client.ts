import { createClient } from '@supabase/supabase-js';

// Verify the existing browser access token with getUser() at the route.
// Database reads use that user's RLS identity, never the service role.
export function createRequestClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase configuration is unavailable.');
  const authorization = request.headers.get('authorization');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: authorization ? { Authorization: authorization } : {} },
  });
}
