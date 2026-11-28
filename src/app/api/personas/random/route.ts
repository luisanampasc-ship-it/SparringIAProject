import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { generateRandomB2B, generateRandomB2C } from "@/lib/persona-generator";
import { requireUser } from "@/lib/supabase/guard";
import type { Persona } from "@/lib/types";

/**
 * POST /api/personas/random
 * Cliente aleatorio para practicar:
 *  - B2B: a partir del sector (y, opcional, el cargo y su nivel de decisión).
 *  - B2C: a partir del resumen de tus actividades (tus principales servicios o productos).
 * Con ANTHROPIC_API_KEY lo genera Claude; sin ella, reglas con variedad aleatoria.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  segment: z.enum(["B2B", "B2C"]),
  sector: z.string().max(120).optional(),
  activities: z.string().max(1500).optional(),
  offer: z.string().max(500).optional(),
  role: z.string().max(120).optional(),
  authority: z.enum(["decide", "propone", "informa"]).optional(),
  gender: z.enum(["masculino", "femenino"]).optional(),
});

const Generated = z.object({
  gender: z.enum(["masculino", "femenino"]),
  name: z.string().describe("Nombre y apellido ficticios, hispanos, coherentes con el género"),
  role: z.string().describe("Cargo (B2B) o 'Cliente particular'/'Clienta particular' (B2C)"),
  company: z.string().describe("Nombre ficticio de la empresa (B2B) o 'Particular' (B2C)"),
  sector: z.string(),
  situation: z.string().describe("Situación concreta en 2-3 frases: qué necesita, por qué ahora y qué le preocupa de esta compra"),
  personality: z.string().describe("Personalidad en una frase, sin punto final"),
  objections: z.array(z.string()).describe("3 objeciones realistas para esta compra"),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Datos no válidos." }, { status: 400 });
  const b = parsed.data;
  if (b.segment === "B2B" && !b.sector?.trim()) return Response.json({ error: "Indica el sector." }, { status: 400 });
  if (b.segment === "B2C" && !b.activities?.trim()) return Response.json({ error: "Resume tus servicios o productos." }, { status: 400 });

  const seed = crypto.randomUUID();
  const base = { id: "", name: "", role: "", company: "", sector: "", tags: [], segment: b.segment, description: "", personality: "", objections: [], createdBy: "" } as Persona;
  const rules =
    b.segment === "B2B"
      ? generateRandomB2B({ sector: b.sector!, offer: b.offer ?? "sus productos o servicios", role: b.role, authority: b.authority, gender: b.gender, seed }, base)
      : generateRandomB2C({ activities: b.activities!, gender: b.gender, seed }, base);

  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ persona: rules, source: "reglas" });

  try {
    const client = new Anthropic();
    const ask =
      b.segment === "B2B"
        ? `Crea un prospecto B2B ficticio y variado (no el típico) del sector "${b.sector}". El comercial le venderá: "${b.offer ?? "sus productos o servicios"}".${b.role ? ` Su cargo es "${b.role}".` : ""}${b.authority ? ` Nivel de decisión: ${b.authority === "decide" ? "decide la compra" : b.authority === "propone" ? "propone a un superior" : "solo recoge información"}.` : ""}`
        : `Crea un cliente particular (B2C) ficticio y variado que podría comprar esto: "${b.activities}". Elige edad, ocupación y situación distintas de las más obvias.`;
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Generated) },
      system: "Creas prospectos ficticios para practicar ventas en español de Perú. Nunca uses nombres de personas reales. Situaciones concretas y creíbles, conectadas con lo que se vende.",
      messages: [{ role: "user", content: `${ask}${b.gender ? ` Género: ${b.gender}.` : ""} Variación: ${seed.slice(0, 8)}.` }],
    });
    const g = response.stop_reason !== "refusal" ? response.parsed_output : null;
    if (!g) return Response.json({ persona: rules, source: "reglas" });
    const persona: Persona = {
      ...rules,
      gender: b.gender ?? g.gender,
      name: g.name,
      role: b.role?.trim() || g.role,
      company: b.segment === "B2C" ? "Particular" : g.company,
      sector: g.sector || rules.sector,
      tags: [g.sector || rules.sector, "Aleatorio"],
      situation: g.situation,
      description: g.situation,
      personality: g.personality.replace(/\.+$/, ""),
      objections: g.objections.slice(0, 3),
    };
    return Response.json({ persona, source: "ia" });
  } catch (e) {
    console.error(e instanceof Anthropic.APIError ? `Claude API ${e.status}: ${e.message}` : e);
    return Response.json({ persona: rules, source: "reglas" });
  }
}
