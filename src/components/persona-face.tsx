/* eslint-disable @next/next/no-img-element */
import type { Persona } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Cara ilustrada y determinista para cada prospecto: el mismo nombre siempre genera la misma cara.
 * Los colores de piel, pelo y ropa son de ilustración (no de interfaz), por eso no usan tokens;
 * el fondo sí usa tokens para respetar el modo oscuro.
 * En producción se podría sustituir por un retrato generado con IA al crear el prospecto.
 */
const SKIN = ["#f6d3b3", "#eab98f", "#d39a6a", "#a86b45", "#7a4a2c", "#f1c7a5"];
const HAIR = ["#2b1d14", "#4a2f1d", "#7a4b28", "#b07a3c", "#d9b26b", "#5b5b5b", "#1d1d24"];
const SHIRT = ["#01a982", "#0069e8", "#6751ff", "#00838f", "#d36d00", "#3e4550"];

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function Face({ seed, className }: { seed: string; className?: string }) {
  const h = hash(seed);
  const pickN = <T,>(xs: T[], shift: number) => xs[(h >>> shift) % xs.length];
  const skin = pickN(SKIN, 0);
  const hair = pickN(HAIR, 3);
  const shirt = pickN(SHIRT, 6);
  const style = (h >>> 9) % 5; // 0 corto, 1 largo, 2 moño, 3 rizado, 4 rapado
  const glasses = (h >>> 12) % 4 === 0;
  const beard = style !== 1 && style !== 2 && (h >>> 14) % 4 === 0;

  return (
    <svg viewBox="0 0 64 64" className={cn("block", className)} aria-hidden>
      <rect width="64" height="64" fill="var(--primary-soft)" />
      {style === 1 && <path d="M15 30c0-12 7-20 17-20s17 8 17 20v20H15z" fill={hair} />}
      {/* hombros y cuello */}
      <path d="M10 64c1-11 10-17 22-17s21 6 22 17z" fill={shirt} />
      <rect x="27" y="38" width="10" height="10" rx="4" fill={skin} />
      <path d="M26 47l6 5 6-5" fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth="1.5" />
      {/* cabeza */}
      <ellipse cx="32" cy="28" rx="12" ry="14" fill={skin} />
      <ellipse cx="20.5" cy="29" rx="2" ry="3" fill={skin} />
      <ellipse cx="43.5" cy="29" rx="2" ry="3" fill={skin} />
      {/* pelo */}
      {style === 0 && <path d="M20 26c0-9 5-13 12-13s12 4 12 13c-3-4-7-6-12-6s-9 2-12 6z" fill={hair} />}
      {style === 1 && <path d="M19.5 28c0-10 5-15 12.5-15S44.5 18 44.5 28c-2-5-6-8-12.5-8S21.5 23 19.5 28z" fill={hair} />}
      {style === 2 && (
        <>
          <circle cx="32" cy="11" r="5" fill={hair} />
          <path d="M20 26c0-9 5-13 12-13s12 4 12 13c-3-5-7-7-12-7s-9 2-12 7z" fill={hair} />
        </>
      )}
      {style === 3 && (
        <g fill={hair}>
          {[20, 25, 30, 35, 40, 44].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 16 : 19} r="5" />
          ))}
        </g>
      )}
      {style === 4 && <path d="M21 23c1-6 5-9 11-9s10 3 11 9c-3-2-7-3-11-3s-8 1-11 3z" fill={hair} fillOpacity=".7" />}
      {beard && <path d="M22 32c1 8 5 11 10 11s9-3 10-11c-2 3-5 4-10 4s-8-1-10-4z" fill={hair} />}
      {/* cara */}
      <path d="M25.5 24.5h4M34.5 24.5h4" stroke={hair} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="27.5" cy="28" r="1.4" fill="#1d1f27" />
      <circle cx="36.5" cy="28" r="1.4" fill="#1d1f27" />
      <path d="M32 29.5l-1 4h2" fill="none" stroke="#000000" strokeOpacity=".2" strokeWidth="1" strokeLinecap="round" />
      <path d="M28.5 36c2 1.8 5 1.8 7 0" fill="none" stroke="#7a3b2e" strokeWidth="1.4" strokeLinecap="round" />
      {glasses && (
        <g fill="none" stroke="#292d3a" strokeWidth="1.2">
          <circle cx="27.5" cy="28" r="3.6" />
          <circle cx="36.5" cy="28" r="3.6" />
          <path d="M31.1 28h1.8" />
        </g>
      )}
    </svg>
  );
}

/** Avatar del prospecto: su foto si la tiene o, si no, la cara ilustrada. */
export function PersonaAvatar({ persona, className, ring }: { persona: Pick<Persona, "name" | "photo">; className?: string; ring?: boolean }) {
  return (
    <span className={cn("block size-10 shrink-0 overflow-hidden rounded-full bg-primary-soft", ring && "ring-4 ring-surface", className)}>
      {persona.photo ? <img src={persona.photo} alt={persona.name} className="size-full object-cover" /> : <Face seed={persona.name} className="size-full" />}
    </span>
  );
}
