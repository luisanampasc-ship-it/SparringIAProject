import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from "./config";

/** Cliente de Supabase con la sesión del usuario (rutas de servidor). Null en modo demo. */
export async function createServerSupabase() {
  if (!supabaseConfigured) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* en componentes de servidor no se pueden escribir cookies: lo hace el middleware */
        }
      },
    },
  });
}
