"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_MINUTE_LIMITS, DEFAULT_RUBRICS, PERSONAS } from "@/lib/catalog";
import { generateDemoData, recomputeScore } from "@/lib/demo-data";
import type { AppNotification, Outcome, Persona, Rubrics, Session } from "@/lib/types";

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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [personas, setPersonas] = useState<Persona[]>(PERSONAS);
  const [rubrics, setRubrics] = useState<Rubrics>(DEFAULT_RUBRICS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [credits, setCredits] = useState(217);
  const [range, setRange] = useState<DateRange>(() => presetRange("1M", new Date(0)));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [minuteLimits, setMinuteLimits] = useState<Record<string, number>>(DEFAULT_MINUTE_LIMITS);

  // Los datos demo se generan en el cliente (relativos a hoy) para evitar desajustes de hidratación.
  useEffect(() => {
    const now = new Date();
    const savedRubrics = loadLocal<Rubrics>("sparring.rubrics", DEFAULT_RUBRICS);
    const data = generateDemoData(now, savedRubrics);
    setRubrics(savedRubrics);
    setSessions(data.sessions);
    setNotifications(data.notifications);
    setNotes(loadLocal("sparring.notes", {}));
    setMinuteLimits(loadLocal("sparring.minuteLimits", DEFAULT_MINUTE_LIMITS));
    setRange(presetRange("1M", now));
    setReady(true);
  }, []);

  const toast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const updateSession = useCallback((id: string, patch: Partial<Session>) => {
    setSessions((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready, sessions, personas, rubrics, notifications, credits, range, toasts, notes, minuteLimits,
      setRange,
      // En producción el límite se guarda en la tabla `members` y se valida también en /api/realtime-token.
      setMinuteLimit: (repId, minutes) =>
        setMinuteLimits((prev) => {
          const next = { ...prev, [repId]: Math.max(0, Math.round(minutes)) };
          saveLocal("sparring.minuteLimits", next);
          return next;
        }),
      setOutcome: (id, outcome) => updateSession(id, { outcome, outcomeSource: "manual" }),
      updateSession,
      addSession: (s) => setSessions((ss) => [s, ...ss]),
      removeSessions: (ids) => setSessions((ss) => ss.filter((s) => !ids.includes(s.id))),
      addPersona: (p) => setPersonas((ps) => [p, ...ps]),
      removePersona: (id) => setPersonas((ps) => ps.filter((p) => p.id !== id)),
      saveRubrics: (r) => {
        setRubrics(r);
        saveLocal("sparring.rubrics", r);
        setSessions((ss) => ss.map((s) => (s.status === "analizada" ? { ...s, score: recomputeScore(s, r) } : s)));
      },
      archiveNotification: (id) =>
        setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, archived: !n.archived } : n))),
      pushNotification: (n) =>
        setNotifications((ns) => [{ ...n, id: `n${Date.now()}`, date: new Date(), archived: false }, ...ns]),
      spendCredits: (min) => setCredits((c) => Math.max(0, c - min)),
      setNote: (id, text) =>
        setNotes((prev) => {
          const next = { ...prev, [id]: text };
          saveLocal("sparring.notes", next);
          return next;
        }),
      toast,
    }),
    [ready, sessions, personas, rubrics, notifications, credits, range, toasts, notes, minuteLimits, updateSession, toast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppStateProvider");
  return ctx;
}
