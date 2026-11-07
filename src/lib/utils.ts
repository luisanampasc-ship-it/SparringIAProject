import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Color semántico para una puntuación 0-100. */
export function scoreTone(score: number): "good" | "warn" | "bad" {
  if (score >= 70) return "good";
  if (score >= 50) return "warn";
  return "bad";
}

export const toneText = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
} as const;

export const toneBg = {
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
} as const;

export const toneSoft = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
} as const;

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function formatLongDate(d: Date) {
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatTime(d: Date) {
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export function formatShortDay(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 100);
}

export function avg(xs: number[]) {
  return xs.length === 0 ? 0 : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function timeAgo(d: Date, now = new Date()) {
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace alrededor de ${h} hora${h === 1 ? "" : "s"}`;
  const days = Math.round(h / 24);
  return `hace ${days} día${days === 1 ? "" : "s"}`;
}
