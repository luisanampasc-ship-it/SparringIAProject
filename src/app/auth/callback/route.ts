import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Vuelta desde los correos de Supabase (confirmación de cuenta, invitación, recuperar contraseña).
 * Canjea el código por una sesión y redirige a `next`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/simulador";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/simulador";
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.redirect(new URL("/simulador", url.origin));

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Enlace incompleto") };

  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("El enlace no es válido o ha caducado. Vuelve a intentarlo.")}`, url.origin));
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
