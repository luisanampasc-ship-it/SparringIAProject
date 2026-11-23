import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * POST /api/team/invite: un admin o manager invita a alguien a su organización.
 * Se guarda la invitación (con las reglas de seguridad del usuario) y Supabase envía el correo.
 * Al registrarse, la base de datos lo une a la organización según la invitación.
 */

const Body = z.object({ email: z.string().email().max(200), role: z.enum(["admin", "manager", "comercial"]) });

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return Response.json({ error: "Supabase no está configurado" }, { status: 501 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Email no válido" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();

  const { data: me } = await supabase.from("members").select("org_id, role").eq("user_id", auth.user.id).maybeSingle();
  if (!me || !["admin", "manager"].includes(me.role)) return Response.json({ error: "Solo un administrador o manager puede invitar" }, { status: 403 });

  const { data: invite, error } = await supabase
    .from("invites")
    .upsert({ org_id: me.org_id, email, role: parsed.data.role }, { onConflict: "org_id,email" })
    .select("id,email,role,minute_limit")
    .single();
  if (error) return Response.json({ error: "No se pudo guardar la invitación" }, { status: 500 });

  const admin = createAdminSupabase();
  if (!admin) return Response.json({ error: "Falta SUPABASE_SECRET_KEY en el servidor" }, { status: 500 });
  const origin = new URL(req.url).origin;
  const { error: mailError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/auth/callback?next=/auth/nueva-contrasena` });
  if (mailError) {
    // Ya tiene cuenta (en otra organización) u otro problema con el correo.
    await supabase.from("invites").delete().eq("id", invite.id);
    return Response.json({ error: /registered|exists/i.test(mailError.message) ? "Ese email ya tiene una cuenta en Sparring IA" : "No se pudo enviar el correo de invitación" }, { status: 400 });
  }
  return Response.json({ invite });
}
