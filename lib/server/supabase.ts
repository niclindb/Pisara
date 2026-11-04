// Supabase Auth on the server (A1). The session lives in cookies that
// @supabase/ssr reads and refreshes; proxy.ts keeps them fresh on each request.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "./env";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a page render, where cookies are read-only. proxy.ts refreshes them instead.
        }
      },
    },
  });
}
