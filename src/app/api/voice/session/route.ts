import { z } from "zod";
import { elevenLabsEnabled, getAgentId, getConversationToken, getVoice } from "@/lib/elevenlabs";
import { buildProspectPrompt } from "@/lib/prospect-prompt";
import { remainingMinutes, requireUser } from "@/lib/supabase/guard";
import type { Persona } from "@/lib/types";

/**
 * POST /api/voice/session
 * Prepara una llamada de voz con ElevenLabs: guion del prospecto, voz peruana según su sexo
 * y un token temporal para que el navegador se conecte por WebRTC.
 * Sin ELEVENLABS_API_KEY responde 501 y el simulador sigue en modo demo.
 */

export const runtime = "nodejs";

const Body = z.object({
  persona: z.object({
    name: z.string().max(120),
    gender: z.enum(["masculino", "femenino"]).optional(),
    role: z.string().max(160),
    company: z.string().max(200),
    sector: z.string().max(120).optional(),
    description: z.string().max(4000),
    situation: z.string().max(4000).optional(),
    personality: z.string().max(1000),
    objections: z.array(z.string().max(300)).max(10),
    offer: z.string().max(300).optional(),
    companyInfo: z
      .object({
        relation: z.enum(["cliente", "tu_negocio"]),
        name: z.string(),
        sector: z.string(),
        customers: z.string(),
        offering: z.array(z.string()),
      })
      .passthrough()
      .optional(),
  }),
  difficulty: z.enum(["facil", "medio", "dificil"]),
  callType: z.enum(["cold_call", "cualificacion", "videollamada"]),
  // En modo demo lo envía el cliente; con Supabase se calcula en el servidor.
  remainingMinutes: z.number().min(0).max(100000),
});

export async function POST(req: Request) {
  if (!elevenLabsEnabled()) return Response.json({ enabled: false }, { status: 501 });
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Datos no válidos." }, { status: 400 });
  const { difficulty, callType } = parsed.data;
  // Con Supabase, el límite se calcula en el servidor con los datos reales (no se confía en el navegador).
  const remaining = auth ? await remainingMinutes(auth.supabase, auth.user.id) : parsed.data.remainingMinutes;
  if (remaining <= 0) return Response.json({ error: "Has alcanzado tu límite mensual de minutos." }, { status: 403 });

  const persona = parsed.data.persona as unknown as Persona;
  const { prompt, firstMessage } = buildProspectPrompt(persona, difficulty, callType);
  try {
    const agentId = await getAgentId();
    const [voice, token] = await Promise.all([getVoice(persona.gender), getConversationToken(agentId, "comercial")]);
    return Response.json({
      enabled: true,
      token,
      voiceName: voice?.name ?? "voz por defecto del agente",
      overrides: {
        agent: { prompt: { prompt }, firstMessage, language: "es" },
        ...(voice ? { tts: { voiceId: voice.id } } : {}),
      },
    });
  } catch (e) {
    console.error("ElevenLabs:", e);
    return Response.json({ error: "No se pudo conectar con ElevenLabs. Revisa la clave y el plan." }, { status: 502 });
  }
}
