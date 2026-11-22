import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

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
  try {
    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    const stream = await client.conversationalAi.conversations.audio.get(id);
    return new Response(stream, { headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=3600" } });
  } catch {
    // Normalmente: la grabación aún se está procesando.
    return new Response("Grabación no disponible todavía", { status: 404 });
  }
}
