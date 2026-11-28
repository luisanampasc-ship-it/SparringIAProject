import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/guard";
import type { Session } from "@/lib/types";

async function saveCopy(session: { id: string; org_id: string; data: Session }, audio: Uint8Array) {
  const admin = createAdminSupabase();
  if (!admin) return;
  const path = `${session.org_id}/${session.id}.full.mp3`;
  const { error } = await admin.storage.from("recordings").upload(path, audio, { contentType: "audio/mpeg", upsert: true });
  if (error) return console.error("No se pudo copiar la grabación a Storage", error);
  const data = { ...session.data, capture: { ...session.data.capture!, fullAudioPath: path } };
  const { error: upd } = await admin.from("sessions").update({ data }).eq("id", session.id);
  if (upd) console.error("No se pudo enlazar la copia de la grabación", upd);
}

/**
 * GET /api/voice/audio?conversationId=...
 * Devuelve la grabación completa (comercial + prospecto) de una llamada del simulador,
 * guardada por ElevenLabs. Puede tardar unos segundos en estar disponible tras colgar.
 * En producción: comprobar que la sesión pertenece al usuario y copiar el audio a Storage.
 */

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!process.env.ELEVENLABS_API_KEY) return new Response("ElevenLabs no está configurado", { status: 501 });
  const id = new URL(req.url).searchParams.get("conversationId") ?? "";
  if (!/^[A-Za-z0-9_-]{5,100}$/.test(id)) return new Response("Identificador no válido", { status: 400 });
  // Con Supabase: solo quien puede ver la sesión (su organización y rol) puede escuchar la grabación.
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  type Row = { id: string; org_id: string; data: Session };
  let session: Row | null = null;
  if (auth) {
    const { data } = await auth.supabase.from("sessions").select("id, org_id, data").eq("data->capture->>conversationId", id).limit(1);
    if (!data?.length) return new Response("Grabación no encontrada", { status: 404 });
    session = data[0] as Row;
  }
  try {
    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    const stream = await client.conversationalAi.conversations.audio.get(id);
    const audio = new Uint8Array(await new Response(stream).arrayBuffer());
    // Copia permanente en Supabase Storage: las siguientes veces carga desde allí, sin depender de ElevenLabs.
    if (session && !session.data.capture?.fullAudioPath) await saveCopy(session, audio);
    return new Response(audio, { headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=3600" } });
  } catch {
    // Normalmente: la grabación aún se está procesando.
    return new Response("Grabación no disponible todavía", { status: 404 });
  }
}
