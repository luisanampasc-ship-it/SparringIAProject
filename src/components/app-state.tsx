"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_MINUTE_LIMITS, DEFAULT_RUBRICS, PERSONAS, setRoster } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase/client";
import { loadOrgData, memberToRep, sessionRow, uploadRecording, type InviteRow, type MemberRow } from "@/lib/supabase/data";
import { generateDemoData, recomputeScore } from "@/lib/demo-data";
import type { AppNotification, MyOffer, Outcome, Persona, Role, Rubrics, Session } from "@/lib/types";

/** Usuario con sesión iniciada (solo con Supabase). */
export interface Account {
  userId: string;
  orgId: string;
  orgName: string;
  name: string;
  email: string;
  role: Role;
}

export const DEFAULT_OFFER: MyOffer = { company: "Mi empresa", product: "Programa de formación en ventas consultivas para equipos comerciales" };

export type RangePreset = "1W" | "1M" | "3M" | "6M" | "YTD" | "custom";
export interface DateRange {
  preset: RangePreset;
  from: Date;
  to: Date;
}

export interface Toast {
  id: number;
  message: string;
}

interface AppState {
  ready: boolean;
  /** "demo": datos de ejemplo en el navegador. "supabase": datos reales con inicio de sesión. */
  mode: "demo" | "supabase";
  account: Account | null;
  members: MemberRow[];
  invites: InviteRow[];
  updateMember: (userId: string, patch: Partial<Pick<MemberRow, "role" | "active">>) => void;
  /** Devuelve null si va bien o el mensaje de error. */
  inviteMember: (email: string, role: Role) => Promise<string | null>;
  cancelInvite: (id: string) => void;
  signOut: () => Promise<void>;
  /** Sube una grabación a Storage y devuelve su ruta (null en modo demo o si falla). */
  uploadRecording: (sessionId: string, blob: Blob) => Promise<string | null>;
  sessions: Session[];
  personas: Persona[];
  rubrics: Rubrics;
  notifications: AppNotification[];
  credits: number;
  range: DateRange;
  toasts: Toast[];
  notes: Record<string, string>;
  /** Límite mensual de minutos de simulador por colaborador (id → minutos). */
  minuteLimits: Record<string, number>;
  setMinuteLimit: (repId: string, minutes: number) => void;
  myOffer: MyOffer;
  setMyOffer: (o: MyOffer) => void;
  setRange: (r: DateRange) => void;
  setOutcome: (id: string, outcome: Outcome) => void;
  updateSession: (id: string, patch: Partial<Session>) => void;
  addSession: (s: Session) => void;
  removeSessions: (ids: string[]) => void;
  addPersona: (p: Persona) => void;
  removePersona: (id: string) => void;
  saveRubrics: (r: Rubrics) => void;
  archiveNotification: (id: string) => void;
  pushNotification: (n: Omit<AppNotification, "id" | "date" | "archived">) => void;
  spendCredits: (min: number) => void;
  setNote: (id: string, text: string) => void;
  toast: (message: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function presetRange(preset: Exclude<RangePreset, "custom">, now = new Date()): DateRange {
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  if (preset === "1W") from.setDate(from.getDate() - 7);
  if (preset === "1M") from.setMonth(from.getMonth() - 1);
  if (preset === "3M") from.setMonth(from.getMonth() - 3);
  if (preset === "6M") from.setMonth(from.getMonth() - 6);
  if (preset === "YTD") from.setMonth(0, 1);
  return { preset, from, to };
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"demo" | "supabase">("demo");
  const [account, setAccount] = useState<Account | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [personas, setPersonas] = useState<Persona[]>(PERSONAS);
  const [rubrics, setRubrics] = useState<Rubrics>(DEFAULT_RUBRICS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [credits, setCredits] = useState(217);
  const [range, setRange] = useState<DateRange>(() => presetRange("1M", new Date(0)));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [minuteLimits, setMinuteLimits] = useState<Record<string, number>>(DEFAULT_MINUTE_LIMITS);
  const [myOffer, setMyOfferState] = useState<MyOffer>(DEFAULT_OFFER);
  const sessionsRef = useRef<Session[]>([]);
  sessionsRef.current = sessions;
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const toast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  /** Ejecuta una escritura en Supabase (si está activo) y avisa si falla. */
  const persist = useCallback(
    (label: string, op: (sb: SupabaseClient, orgId: string) => PromiseLike<{ error: unknown } | void>) => {
      const sb = getSupabase();
      if (!sb || !account) return;
      Promise.resolve(op(sb, account.orgId)).then(
        (res) => {
          if (res && res.error) {
            console.error(label, res.error);
            toast(`No se pudo guardar: ${label}`);
          }
        },
        (e) => {
          console.error(label, e);
          toast(`No se pudo guardar: ${label}`);
        },
      );
    },
    [account, toast],
  );

  // Carga inicial: Supabase si está configurado; si no, datos demo generados en el cliente
  // (relativos a hoy, para evitar desajustes de hidratación).
  useEffect(() => {
    const now = new Date();
    setRange(presetRange("1M", now));
    const sb = getSupabase();
    if (!sb) {
      const savedRubrics = loadLocal<Rubrics>("sparring.rubrics", DEFAULT_RUBRICS);
      const data = generateDemoData(now, savedRubrics);
      setRubrics(savedRubrics);
      setSessions(data.sessions);
      setNotifications(data.notifications);
      setNotes(loadLocal("sparring.notes", {}));
      setMinuteLimits(loadLocal("sparring.minuteLimits", DEFAULT_MINUTE_LIMITS));
      setMyOfferState(loadLocal("sparring.myOffer", DEFAULT_OFFER));
      setReady(true);
      return;
    }
    loadOrgData(sb)
      .then(async (data) => {
        if (!data) {
          // Sin sesión (o sin organización): al login.
          window.location.href = "/login";
          return;
        }
        const reps = data.members.map(memberToRep);
        const me = reps.find((r) => r.id === data.userId) ?? reps[0];
        setRoster(reps, me);
        setMode("supabase");
        setAccount({ userId: data.userId, orgId: data.orgId, orgName: data.orgName, name: me.name, email: me.email, role: me.role });
        setMembers(data.members);
        setInvites(data.invites);
        setMinuteLimits(Object.fromEntries(data.members.map((m) => [m.user_id, m.minute_limit])));
        setSessions(data.sessions);
        setNotes(data.notes);
        if (data.myOffer) setMyOfferState(data.myOffer);
        setRubrics(data.rubrics ?? DEFAULT_RUBRICS);
        // Organización nueva: se le dan los prospectos de ejemplo para empezar a practicar.
        if (data.personas.length === 0) {
          const seeded = PERSONAS.map((p) => ({ ...p, id: `${p.id}-${data.orgId.slice(0, 8)}`, createdBy: data.userId }));
          setPersonas(seeded);
          const { error } = await sb.from("personas").insert(seeded.map((p) => ({ id: p.id, org_id: data.orgId, created_by: data.userId, data: p })));
          if (error) console.error("seed personas", error);
        } else {
          setPersonas(data.personas);
        }
        setReady(true);
      })
      .catch((e) => {
        console.error(e);
        toast("No se pudieron cargar los datos. Revisa la conexión con Supabase.");
      });
  }, [toast]);

  const updateSession = useCallback(
    (id: string, patch: Partial<Session>) => {
      const current = sessionsRef.current.find((s) => s.id === id);
      setSessions((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      if (current) {
        const merged = { ...current, ...patch };
        persist("la sesión", (sb, orgId) => sb.from("sessions").update(sessionRow(merged, orgId)).eq("id", id));
      }
    },
    [persist],
  );

  const value = useMemo<AppState>(
    () => ({
      ready, mode, account, members, invites, sessions, personas, rubrics, notifications, credits, range, toasts, notes, minuteLimits, myOffer,
      setRange,
      setMyOffer: (o) => {
        setMyOfferState(o);
        saveLocal("sparring.myOffer", o);
        persist("tu empresa y lo que vendes", (sb, orgId) => sb.from("organizations").update({ offer_company: o.company, offer_product: o.product }).eq("id", orgId));
      },
      setMinuteLimit: (repId, minutes) => {
        const value = Math.max(0, Math.round(minutes));
        setMinuteLimits((prev) => {
          const next = { ...prev, [repId]: value };
          saveLocal("sparring.minuteLimits", next);
          return next;
        });
        setMembers((ms) => ms.map((m) => (m.user_id === repId ? { ...m, minute_limit: value } : m)));
        persist("el límite de minutos", (sb, orgId) => sb.from("members").update({ minute_limit: value }).eq("org_id", orgId).eq("user_id", repId));
      },
      updateMember: (userId, patch) => {
        setMembers((ms) => ms.map((m) => (m.user_id === userId ? { ...m, ...patch } : m)));
        persist("el miembro", (sb, orgId) => sb.from("members").update(patch).eq("org_id", orgId).eq("user_id", userId));
      },
      inviteMember: async (email, role) => {
        const res = await fetch("/api/team/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return data.error ?? "No se pudo enviar la invitación";
        // Al invitar, Supabase crea la cuenta y la base de datos la une a la organización:
        // se recarga la lista de miembros para mostrarla.
        const sb = getSupabase();
        if (sb && account) {
          const { data: rows } = await sb.from("members").select("*").eq("org_id", account.orgId).order("created_at");
          if (rows) {
            const list = rows as MemberRow[];
            setMembers(list);
            setMinuteLimits(Object.fromEntries(list.map((m) => [m.user_id, m.minute_limit])));
            const reps = list.map(memberToRep);
            setRoster(reps, reps.find((r) => r.id === account.userId) ?? reps[0]);
          }
          const { data: inv } = await sb.from("invites").select("id,email,role,minute_limit").eq("org_id", account.orgId);
          setInvites((inv ?? []) as InviteRow[]);
        }
        return null;
      },
      cancelInvite: (id) => {
        setInvites((xs) => xs.filter((x) => x.id !== id));
        persist("la invitación", (sb) => sb.from("invites").delete().eq("id", id));
      },
      signOut: async () => {
        await getSupabase()?.auth.signOut();
        window.location.href = "/login";
      },
      uploadRecording: async (sessionId, blob) => {
        const sb = getSupabase();
        if (!sb || !account) return null;
        try {
          return await uploadRecording(sb, account.orgId, sessionId, blob);
        } catch (e) {
          console.error("upload recording", e);
          toast("No se pudo guardar la grabación");
          return null;
        }
      },
      setOutcome: (id, outcome) => updateSession(id, { outcome, outcomeSource: "manual" }),
      updateSession,
      addSession: (s) => {
        setSessions((ss) => [s, ...ss]);
        persist("la sesión", (sb, orgId) => sb.from("sessions").insert(sessionRow(s, orgId)));
      },
      removeSessions: (ids) => {
        setSessions((ss) => ss.filter((s) => !ids.includes(s.id)));
        persist("el borrado de sesiones", (sb) => sb.from("sessions").delete().in("id", ids));
      },
      addPersona: (p) => {
        setPersonas((ps) => [p, ...ps]);
        persist("el prospecto", (sb, orgId) => sb.from("personas").insert({ id: p.id, org_id: orgId, created_by: account?.userId, data: { ...p, createdBy: account?.userId ?? p.createdBy } }));
      },
      removePersona: (id) => {
        setPersonas((ps) => ps.filter((p) => p.id !== id));
        persist("el borrado del prospecto", (sb) => sb.from("personas").delete().eq("id", id));
      },
      saveRubrics: (r) => {
        setRubrics(r);
        saveLocal("sparring.rubrics", r);
        const rescored = sessionsRef.current.map((s) => (s.status === "analizada" ? { ...s, score: recomputeScore(s, r) } : s));
        setSessions(rescored);
        persist("los criterios", (sb, orgId) => sb.from("organizations").update({ rubrics: r }).eq("id", orgId));
        // Las puntuaciones recalculadas también se guardan.
        persist("las puntuaciones", (sb, orgId) => sb.from("sessions").upsert(rescored.map((s) => sessionRow(s, orgId))));
      },
      archiveNotification: (id) =>
        setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, archived: !n.archived } : n))),
      pushNotification: (n) =>
        setNotifications((ns) => [{ ...n, id: `n${Date.now()}`, date: new Date(), archived: false }, ...ns]),
      spendCredits: (min) => setCredits((c) => Math.max(0, c - min)),
      setNote: (id, text) => {
        setNotes((prev) => {
          const next = { ...prev, [id]: text };
          saveLocal("sparring.notes", next);
          return next;
        });
        // Guardado automático con una pequeña espera para no escribir en cada tecla.
        clearTimeout(noteTimers.current[id]);
        noteTimers.current[id] = setTimeout(() => {
          persist("la nota", (sb, orgId) => sb.from("session_notes").upsert({ session_id: id, org_id: orgId, text, updated_at: new Date().toISOString() }));
        }, 800);
      },
      toast,
    }),
    [ready, mode, account, members, invites, sessions, personas, rubrics, notifications, credits, range, toasts, notes, minuteLimits, myOffer, updateSession, persist, toast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppStateProvider");
  return ctx;
}
