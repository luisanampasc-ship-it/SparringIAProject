import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabase } from "./server";

/**
 * Para rutas de API: con Supabase configurado exige sesión iniciada.
 * Devuelve { supabase, user }, null si estamos en modo demo, o una Response 401.
 */
export async function requireUser(): Promise<{ supabase: SupabaseClient; user: User } | null | Response> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  return { supabase, user: data.user };
}

/** Minutos de simulador que le quedan este mes al usuario (límite del miembro menos lo usado). */
export async function remainingMinutes(supabase: SupabaseClient, userId: string) {
  const { data: me } = await supabase.from("members").select("minute_limit").eq("user_id", userId).maybeSingle();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const { data: rows } = await supabase
    .from("sessions")
    .select("duration_min")
    .eq("rep_id", userId)
    .eq("type", "roleplay")
    .gte("started_at", start.toISOString());
  const used = (rows ?? []).reduce((a, r) => a + (r.duration_min ?? 0), 0);
  return Math.max(0, (me?.minute_limit ?? 0) - used);
}
