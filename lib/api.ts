import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/** Standard JSON error response `{ error: string }` with a status code. */
export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type AuthedContext = {
  supabase: ServerSupabaseClient;
  user: User;
};

/**
 * Resolves the current session for a route handler. Returns either an
 * `{ supabase, user }` context or a ready-to-return 401 NextResponse.
 */
export async function requireUser(): Promise<
  AuthedContext | { response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { response: errorResponse("Unauthorized", 401) };
  }

  return { supabase, user };
}
