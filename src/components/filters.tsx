"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { Segmented, Select } from "@/components/ui";
import { applyFilters, type Filters, type TypeFilter } from "@/lib/analytics";
import { CALL_TYPES, REPS } from "@/lib/catalog";
import type { CallType } from "@/lib/types";

/** Estado de filtros compartido por las páginas de analítica. */
export function useFilters() {
  const { sessions, range } = useApp();
  const [type, setType] = useState<TypeFilter>("all");
  const [repId, setRepId] = useState("all");
  const [callType, setCallType] = useState<CallType | "all">("all");
  const filters: Filters = { type, repId, callType, from: range.from, to: range.to };
  const filtered = useMemo(() => applyFilters(sessions, filters), [sessions, type, repId, callType, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => {
    const base = applyFilters(sessions, { ...filters, type: "all" });
    return { all: base.length, real: base.filter((s) => s.type === "real").length, roleplay: base.filter((s) => s.type === "roleplay").length };
  }, [sessions, repId, callType, range]); // eslint-disable-line react-hooks/exhaustive-deps
  return { filters, filtered, counts, type, setType, repId, setRepId, callType, setCallType };
}

export function TypeSegmented({ value, onChange, counts, labels }: { value: TypeFilter; onChange: (v: TypeFilter) => void; counts: { all: number; real: number; roleplay: number }; labels?: [string, string, string] }) {
  const [a, b, c] = labels ?? ["Combinado", "Llamadas reales", "Roleplays IA"];
  return (
    <Segmented
      value={value}
      onChange={onChange}
      options={[
        { value: "all", label: `${a} (${counts.all})` },
        { value: "real", label: `${b} (${counts.real})` },
        { value: "roleplay", label: `${c} (${counts.roleplay})` },
      ]}
    />
  );
}

export function RepSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select
      label="Filtrar por:"
      value={value}
      onChange={onChange}
      options={[{ value: "all", label: "Todos los comerciales" }, ...REPS.map((r) => ({ value: r.id, label: r.name }))]}
    />
  );
}

export function CallTypeSelect({ value, onChange, count }: { value: CallType | "all"; onChange: (v: CallType | "all") => void; count: number }) {
  return (
    <Select
      label="Tipo:"
      value={value}
      onChange={onChange}
      options={[{ value: "all", label: `Todos los tipos (${count})` }, ...CALL_TYPES.map((c) => ({ value: c.id, label: c.label }))]}
    />
  );
}
