import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

/**
 * Validates that the request comes from an authenticated admin user.
 * This MUST be used for all admin operations to prevent unauthorized access.
 *
 * @param authHeader - The Authorization header from the request
 * @returns Object with isAdmin boolean and optional user data
 */
export async function validateAdminAuth(authHeader: string | null): Promise<{
  isAdmin: boolean;
  userId?: string;
  error?: string;
}> {
  if (!authHeader) {
    return { isAdmin: false, error: 'No authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return { isAdmin: false, error: 'Server configuration error' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return { isAdmin: false, error: userError?.message || 'User not found' };
    }

    const isAdmin = user.app_metadata?.role === 'admin';

    return {
      isAdmin,
      userId: user.id,
    };
  } catch (error) {
    return { isAdmin: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
