import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { Gender } from "./types";

/*
 * Integración con ElevenLabs Agents (solo en el servidor; la clave nunca llega al navegador).
 *  - Un único agente "Sparring IA · Prospecto" que admite que cada llamada sustituya el guion,
 *    el primer mensaje, el idioma y la voz (overrides).
 *  - Voces con acento peruano tomadas de la biblioteca de ElevenLabs (o fijadas por variables de entorno).
 */

const AGENT_NAME = "Sparring IA · Prospecto";

/** Herramienta del sistema que permite al prospecto colgar (p. ej. tras 3 errores seguidos del comercial). */
const END_CALL_TOOL = {
  type: "system" as const,
  name: "end_call",
  description: "Cuelga la llamada. Úsala solo cuando el guion lo indique (por ejemplo, si el comercial comete tres errores seguidos) o cuando la conversación haya terminado con una despedida.",
  params: { systemToolType: "end_call" as const },
};
const TTS_MODEL = "eleven_flash_v2_5"; // multilingüe y de baja latencia

export function elevenLabsEnabled() {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

function client() {
  return new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
}

// Caché en memoria de la instancia del servidor (se rehace en frío, sin problema).
let cachedAgentId: string | null = null;
const cachedVoices: Partial<Record<Gender, { id: string; name: string } | null>> = {};

/** Devuelve el id del agente: variable de entorno, uno existente con el mismo nombre o uno nuevo. */
export async function getAgentId(): Promise<string> {
  if (process.env.ELEVENLABS_AGENT_ID) return process.env.ELEVENLABS_AGENT_ID;
  if (cachedAgentId) return cachedAgentId;
  const el = client();
  const page = await el.conversationalAi.agents.list({ search: AGENT_NAME, pageSize: 10 });
  const existing = page.agents.find((a) => a.name === AGENT_NAME);
  if (existing) {
    // Los agentes creados antes no tenían la herramienta de colgar: se añade (una vez por arranque).
    try {
      await el.conversationalAi.agents.update(existing.agentId, {
        conversationConfig: { agent: { prompt: { builtInTools: { endCall: END_CALL_TOOL } } } },
      });
    } catch (e) {
      console.error("ElevenLabs: no se pudo activar end_call en el agente", e);
    }
    cachedAgentId = existing.agentId;
    return existing.agentId;
  }
  const created = await el.conversationalAi.agents.create({
    name: AGENT_NAME,
    tags: ["sparring-ia"],
    conversationConfig: {
      agent: {
        language: "es",
        firstMessage: "¿Aló?",
        prompt: { prompt: "Eres un prospecto en una llamada de ventas. El guion concreto llega en cada llamada.", builtInTools: { endCall: END_CALL_TOOL } },
      },
      tts: { modelId: TTS_MODEL },
    },
    platformSettings: {
      // Permite que cada llamada envíe su propio guion, primer mensaje, idioma y voz.
      overrides: {
        conversationConfigOverride: {
          agent: { prompt: { prompt: true }, firstMessage: true, language: true },
          tts: { voiceId: true },
        },
      },
    },
  });
  cachedAgentId = created.agentId;
  return created.agentId;
}

/**
 * Voz con acento peruano para el género indicado.
 * Prioridad: ELEVENLABS_VOICE_FEMALE / ELEVENLABS_VOICE_MALE > biblioteca (acento peruano, luego latinoamericano).
 * Las voces de la biblioteca se añaden a "Mis voces" para poder usarlas en el agente.
 */
export async function getVoice(gender: Gender | undefined): Promise<{ id: string; name: string } | null> {
  const g: Gender = gender ?? "femenino";
  const fromEnv = g === "masculino" ? process.env.ELEVENLABS_VOICE_MALE : process.env.ELEVENLABS_VOICE_FEMALE;
  if (fromEnv) return { id: fromEnv, name: "voz configurada" };
  if (g in cachedVoices) return cachedVoices[g] ?? null;
  const el = client();
  let found: { id: string; name: string } | null = null;
  for (const accent of ["peruvian", "latin american", undefined]) {
    try {
      const res = await el.voices.getShared({ pageSize: 10, language: "es", gender: g === "masculino" ? "male" : "female", ...(accent ? { accent } : {}), sort: "trending" });
      const v = res.voices[0];
      if (!v) continue;
      // Añadir a la biblioteca propia (si ya está, la API puede devolver error: usamos el id original).
      try {
        const added = await el.voices.share(v.publicOwnerId, v.voiceId, { newName: `Sparring · ${v.name}` });
        found = { id: added.voiceId, name: v.name };
      } catch {
        found = { id: v.voiceId, name: v.name };
      }
      break;
    } catch (e) {
      console.error("ElevenLabs: no se pudo buscar voces", e);
    }
  }
  cachedVoices[g] = found;
  return found;
}

export async function getConversationToken(agentId: string, participantName: string) {
  const res = await client().conversationalAi.conversations.getWebrtcToken({ agentId, participantName });
  return res.token;
}
