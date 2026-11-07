"use client";

import { ChevronDown, Info, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn, scoreTone, toneBg, toneSoft, toneText } from "@/lib/utils";

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right, className }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-text">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 [&>*]:max-w-full">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({ variant = "secondary", size = "md", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm",
        variant === "primary" && "bg-primary text-white shadow-sm hover:brightness-110",
        variant === "secondary" && "border border-border bg-surface text-text hover:bg-surface-2",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-text",
        variant === "danger" && "bg-bad text-white hover:brightness-110",
        className,
      )}
      {...rest}
    />
  );
}

export function Segmented<T extends string>({ options, value, onChange, className }: { options: { value: T; label: React.ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("inline-flex max-w-full overflow-x-auto rounded-lg border border-border bg-surface-2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition",
            value === o.value ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pills<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition",
            value === o.value ? "bg-primary text-white" : "text-muted hover:bg-surface-2 hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("flex gap-5 overflow-x-auto border-b border-border", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "-mb-px shrink-0 border-b-2 pb-2 text-sm font-medium whitespace-nowrap transition",
            value === t.value ? "border-primary text-primary-text" : "border-transparent text-muted hover:text-text",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>({ value, onChange, options, className, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; label?: string }) {
  return (
    <label className={cn("relative inline-flex items-center", className)}>
      {label && <span className="mr-2 text-xs text-muted">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-8 appearance-none rounded-lg border border-border bg-surface py-0 pr-8 pl-3 text-xs text-text outline-none focus:ring-2 focus:ring-primary/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-muted" />
    </label>
  );
}

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold", className)}>{children}</span>;
}

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const tone = scoreTone(score);
  if (size === "lg") {
    return (
      <span className={cn("rounded-xl px-3 py-1 text-xl font-bold", toneSoft[tone])}>
        {score}
        <span className="text-xs font-medium opacity-70">/100</span>
      </span>
    );
  }
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-lg border font-bold", size === "sm" ? "size-8 text-xs" : "size-10 text-sm", toneSoft[tone], "border-current/20")}>
      {score}
    </span>
  );
}

export function ProgressBar({ value, max = 100, tone, className }: { value: number; max?: number; tone?: "good" | "warn" | "bad" | "primary"; className?: string }) {
  const p = Math.max(0, Math.min(100, (value / max) * 100));
  const t = tone ?? scoreTone(p);
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <div className={cn("h-full rounded-full", t === "primary" ? "bg-primary" : toneBg[t])} style={{ width: `${p}%` }} />
    </div>
  );
}

export function Kpi({ label, value, hint, extra }: { label: string; value: React.ReactNode; hint?: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-[10px] font-semibold tracking-wider text-faint uppercase">{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="text-3xl font-bold tracking-tight text-text">{value}</p>
        {extra}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function Delta({ value, suffix = "" }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span className={cn("text-xs font-semibold", up ? "text-good" : "text-bad")}>
      {up ? "↑" : "↓"} {up ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, wide }: { open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn("max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl", wide ? "max-w-3xl" : "max-w-md")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface-2" aria-label="Cerrar">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 pb-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Popover simple anclado al trigger; se cierra al hacer clic fuera. */
export function Popover({ trigger, children, align = "right", className }: { trigger: (open: boolean, toggle: () => void) => React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      {trigger(open, () => setOpen((o) => !o))}
      {open && (
        <div className={cn("absolute top-full z-40 mt-2 rounded-xl border border-border bg-surface shadow-xl", align === "right" ? "right-0" : "left-0", className)}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function InfoTip({ text, label }: { text: string; label?: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <Info className="size-3 text-faint" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-border bg-surface p-3 text-left text-xs leading-relaxed font-normal text-muted shadow-xl group-hover:block">
        {label && <span className="mb-1 block text-[11px] font-semibold tracking-wide text-text uppercase">{label}</span>}
        {text}
      </span>
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
  return <span className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-white", className)}>{initials}</span>;
}

export function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="text-faint">{icon}</div>
      <p className="text-sm font-medium text-text">{title}</p>
      {text && <p className="max-w-xs text-xs text-muted">{text}</p>}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[10px] font-semibold tracking-wider text-faint uppercase">{children}</p>;
}

export { toneText, toneSoft };
