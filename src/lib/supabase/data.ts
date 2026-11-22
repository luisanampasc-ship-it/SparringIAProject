"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MyOffer, Persona, Rep, Role, Rubrics, Session } from "@/lib/types";

/*
 * Lectura y escritura de los datos de la organización en Supabase.
 * Las sesiones y prospectos se guardan completos en una columna JSON (`data`), con algunas
 * columnas aparte para filtrar y para las reglas de seguridad.
 */

export interface MemberRow {
  org_id: string;
  user_id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  minute_limit: number;
}

export interface InviteRow {
  id: string;
  email: string;
  role: Role;
  minute_limit: number;
}

export interface OrgData {
  userId: string;
  orgId: string;
  orgName: string;
  members: MemberRow[];
  invites: InviteRow[];
  personas: Persona[];
  sessions: Session[];
  notes: Record<string, string>;
  myOffer: MyOffer | null;
  rubrics: Rubrics | null;
}

/** Error de configuración que se muestra a la persona usuaria en lugar de la app. */
export class SetupError extends Error {}

function describeError(e: { message?: string; code?: string }) {
  const msg = e.message ?? String(e);
  if (e.code === "42P01" || e.code === "PGRST205" || /does not exist|could not find the table/i.test(msg)) {
    return "Faltan las tablas en Supabase: ejecuta el script supabase/migrations/0001_init.sql en el SQL Editor y recarga la página.";
  }
  if (e.code === "42501" || /permission denied/i.test(msg)) {
    return "Supabase denegó el acceso a los datos (permisos). Vuelve a ejecutar el script supabase/migrations/0001_init.sql y recarga.";
  }
  return `No se pudieron cargar los datos de Supabase: ${msg}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => x[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}

export function memberToRep(m: MemberRow): Rep {
  return { id: m.user_id, name: m.name || m.email, initials: initials(m.name || m.email), role: m.role, email: m.email, active: m.active };
}

/** Convierte una fila de `sessions` en Session (las fechas viajan como texto en JSON). */
function reviveSession(data: Session & { date: string | Date }): Session {
  return { ...data, date: new Date(data.date) };
}

/** Quita lo que no debe guardarse (URLs locales del navegador, que dejan de existir al recargar). */
function storableSession(s: Session): Session {
  const audioUrl = s.audioUrl?.startsWith("blob:") ? undefined : s.audioUrl;
  const capture = s.capture ? { ...s.capture, micAudioUrl: undefined } : undefined;
  return { ...s, audioUrl, capture };
}

export function sessionRow(s: Session, orgId: string) {
  const data = storableSession(s);
  return {
    id: s.id,
    org_id: orgId,
    rep_id: s.repId,
    type: s.type,
    call_type: s.callType,
    started_at: s.date.toISOString(),
    duration_min: s.durationMin,
    data,
  };
}

export async function loadOrgData(sb: SupabaseClient): Promise<OrgData | null> {
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return null;
  const { data: me, error } = await sb.from("members").select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw new SetupError(describeError(error));
  if (!me) throw new SetupError("Tu usuario no tiene organización. Suele pasar si se creó antes de ejecutar el script de las tablas: ejecuta en Supabase el script supabase/migrations/0002_backfill_members.sql y recarga.");
  const orgId = (me as MemberRow).org_id;

  const [org, members, invites, personas, sessions, notes] = await Promise.all([
    sb.from("organizations").select("*").eq("id", orgId).single(),
    sb.from("members").select("*").eq("org_id", orgId).order("created_at"),
    sb.from("invites").select("id,email,role,minute_limit").eq("org_id", orgId),
    sb.from("personas").select("data").eq("org_id", orgId).order("created_at", { ascending: false }),
    sb.from("sessions").select("data").eq("org_id", orgId).order("started_at", { ascending: false }).limit(1000),
    sb.from("session_notes").select("session_id,text").eq("org_id", orgId),
  ]);
  for (const r of [org, members, personas, sessions, notes]) if (r.error) throw new SetupError(describeError(r.error));

  const sessionList = (sessions.data ?? []).map((r) => reviveSession(r.data));
  await attachRecordingUrls(sb, sessionList);

  return {
    userId: user.id,
    orgId,
    orgName: org.data.name,
    members: (members.data ?? []) as MemberRow[],
    invites: (invites.data ?? []) as InviteRow[],
    personas: (personas.data ?? []).map((r) => r.data as Persona),
    sessions: sessionList,
    notes: Object.fromEntries((notes.data ?? []).map((n) => [n.session_id, n.text])),
    myOffer: org.data.offer_product ? { company: org.data.offer_company, product: org.data.offer_product } : null,
    rubrics: (org.data.rubrics as Rubrics | null) ?? null,
  };
}

/** Genera enlaces temporales para escuchar las grabaciones guardadas en Storage. */
async function attachRecordingUrls(sb: SupabaseClient, sessions: Session[]) {
  const withAudio = sessions.filter((s) => s.audioPath);
  if (!withAudio.length) return;
  const { data } = await sb.storage.from("recordings").createSignedUrls(withAudio.map((s) => s.audioPath!), 60 * 60 * 12);
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  for (const s of withAudio) {
    const url = byPath.get(s.audioPath!);
    if (!url) continue;
    if (s.audioUrl) s.capture = { ...(s.capture ?? { prospectVoice: "", transcribed: false }), micAudioUrl: url };
    else s.audioUrl = url;
  }
}

/** Sube la grabación del micrófono a Storage y devuelve su ruta (organización/sesión). */
export async function uploadRecording(sb: SupabaseClient, orgId: string, sessionId: string, blob: Blob) {
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const path = `${orgId}/${sessionId}.${ext}`;
  const { error } = await sb.storage.from("recordings").upload(path, blob, { contentType: blob.type || "audio/webm", upsert: true });
  if (error) throw error;
  return path;
}
