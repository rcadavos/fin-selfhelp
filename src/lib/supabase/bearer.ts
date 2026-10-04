import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";

/**
 * The user behind an `Authorization: Bearer <access token>` header, or null when the
 * header is missing or the token is not valid. This is how the mobile app (`mobile/`)
 * authenticates to API routes — it holds a Supabase session but no web cookies.
 */
export async function getUserFromBearer(request: Request): Promise<User | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return null;

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}
