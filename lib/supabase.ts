import {
  createBrowserClient,
  createServerClient as createSupabaseSSRServerClient,
} from "@supabase/ssr";
import { createClient as createSupabaseServiceRoleClient } from "@supabase/supabase-js";

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} belum diisi.`);
  }

  return value;
}

export function createClient() {
  return createBrowserClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

export async function createServerClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = cookies();

  return createSupabaseSSRServerClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components tidak selalu boleh mengubah cookie.
          }
        },
      },
    }
  );
}

export async function createRouteHandlerClient() {
  return createServerClient();
}

export function createSupabaseBrowserClient() {
  return createClient();
}

export async function createSupabaseServerClient() {
  return createServerClient();
}

export function createSupabaseServiceClient() {
  return createSupabaseServiceRoleClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
