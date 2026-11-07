"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { presetRange, useApp, type RangePreset } from "@/components/app-state";
import { Button, Popover } from "@/components/ui";
import { cn } from "@/lib/utils";

const PRESETS: Exclude<RangePreset, "custom">[] = ["1W", "1M", "3M", "6M", "YTD"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DOW = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function MonthGrid({ year, month, from, to, onPick }: { year: number; month: number; from: Date | null; to: Date | null; onPick: (d: Date) => void }) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const cells: (Date | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))];
  return (
    <div className="w-56">
      <p className="mb-2 text-center text-sm font-semibold text-text">
        {MONTHS[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px]">
        {DOW.map((d) => (
          <span key={d} className="text-faint">{d}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const future = d > today;
          const inRange = from && to && d >= from && d <= to;
          const edge = (from && sameDay(d, from)) || (to && sameDay(d, to));
          return (
            <button
              key={i}
              disabled={future}
              onClick={() => onPick(d)}
              className={cn(
                "mx-auto grid size-7 place-items-center rounded-md text-xs",
                future ? "text-faint/50" : "text-text hover:bg-surface-2",
                inRange && "bg-primary-soft text-primary-text",
                edge && "bg-primary text-white hover:bg-primary",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker() {
  const { range, setRange } = useApp();
  const [from, setFrom] = useState<Date | null>(range.from);
  const [to, setTo] = useState<Date | null>(range.to);
  const [preset, setPreset] = useState<RangePreset>(range.preset);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1);
  });
  const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);

  const pick = (d: Date) => {
    setPreset("custom");
    if (!from || (from && to)) {
      setFrom(d);
      setTo(null);
    } else if (d < from) {
      setTo(from);
      setFrom(d);
    } else {
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      setTo(end);
    }
  };

  return (
    <Popover
      className="p-4"
      trigger={(_, toggle) => (
        <button onClick={toggle} className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-text hover:bg-surface-2">
          <CalendarDays className="size-3.5" />
          {range.preset === "custom" ? `${range.from.getDate()}/${range.from.getMonth() + 1} – ${range.to.getDate()}/${range.to.getMonth() + 1}` : range.preset}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="mb-4 flex gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  const r = presetRange(p);
                  setPreset(p);
                  setFrom(r.from);
                  setTo(r.to);
                }}
                className={cn("rounded-full px-3 py-1 text-xs font-medium", preset === p ? "bg-primary text-white" : "text-muted hover:bg-surface-2")}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-start gap-4">
            <button className="mt-0.5 rounded p-1 hover:bg-surface-2" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Mes anterior">
              <ChevronLeft className="size-4" />
            </button>
            <MonthGrid year={cursor.getFullYear()} month={cursor.getMonth()} from={from} to={to} onPick={pick} />
            <div className="hidden sm:block">
              <MonthGrid year={next.getFullYear()} month={next.getMonth()} from={from} to={to} onPick={pick} />
            </div>
            <button className="mt-0.5 rounded p-1 hover:bg-surface-2" onClick={() => setCursor(next)} aria-label="Mes siguiente">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted">
              {from ? from.toLocaleDateString("es-ES") : "—"} → {to ? to.toLocaleDateString("es-ES") : "—"}
            </span>
            <div className="flex gap-2">
              <Button size="sm" onClick={close}>Cancelar</Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!from || !to}
                onClick={() => {
                  if (from && to) setRange({ preset, from, to });
                  close();
                }}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Popover>
  );
}
