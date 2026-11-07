"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-state";
import { MultiLine } from "@/components/charts";
import { CallTypeSelect, TypeSegmented, useFilters } from "@/components/filters";
import { Button, Card, CardHeader, PageHeader, Pills, ProgressBar } from "@/components/ui";
import { rubricSeries, skillStats } from "@/lib/analytics";
import { CALL_TYPES, RUBRIC_COLORS } from "@/lib/catalog";
import type { CallType, RubricKey, Rubrics } from "@/lib/types";
import { avg, cn } from "@/lib/utils";

const LETTER_CLS: Record<RubricKey, string> = {
  apertura: "bg-primary-soft text-primary-text",
  diagnostico: "bg-good-soft text-good",
  objeciones: "bg-bad-soft text-bad",
  cierre: "bg-warn-soft text-warn",
};

export default function CriteriosPage() {
  const { rubrics, saveRubrics, toast } = useApp();
  const f = useFilters();
  const editRef = useRef<HTMLDivElement>(null);
  const [editType, setEditType] = useState<CallType>("cold_call");
  const [draft, setDraft] = useState<Rubrics>(rubrics);
  useEffect(() => setDraft(rubrics), [rubrics]);

  // Para las tarjetas usamos la rúbrica del tipo filtrado (o cold call como referencia en "todos").
  const viewType: CallType = f.callType === "all" ? "cold_call" : f.callType;
  const viewRubric = rubrics[viewType];
  const sub = (k: RubricKey) => avg(f.filtered.map((s) => s.subScores[k] * 4));
  const global = Math.round(viewRubric.reduce((a, c) => a + (sub(c.key) * c.weight) / 100, 0));
  const series = rubricSeries(f.filtered);
  const skills = skillStats(f.filtered).sort((a, b) => b.rate - a.rate);

  const cats = draft[editType];
  const total = cats.reduce((a, c) => a + c.weight, 0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rubrics);

  const setWeight = (i: number, w: number) =>
    setDraft((d) => ({ ...d, [editType]: d[editType].map((c, j) => (j === i ? { ...c, weight: Math.max(0, Math.min(100, w)) } : c)) }));
  const setField = (i: number, k: "name" | "description", v: string) =>
    setDraft((d) => ({ ...d, [editType]: d[editType].map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <PageHeader
        title="Criterios de evaluación"
        subtitle="Los criterios con los que la IA puntúa cada sesión del equipo."
        right={
          <>
            <TypeSegmented value={f.type} onChange={f.setType} counts={f.counts} />
            <CallTypeSelect value={f.callType} onChange={f.setCallType} count={f.counts.all} />
            <Button size="sm" onClick={() => editRef.current?.scrollIntoView({ behavior: "smooth" })}>
              Editar importancia
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card className="p-4 text-center">
          <p className="text-[10px] font-semibold tracking-wider text-faint uppercase">Score global</p>
          <p className="mt-1 text-3xl font-bold text-primary-text">{global}%</p>
          <p className="text-[11px] text-faint">Media ponderada</p>
        </Card>
        {viewRubric.map((c) => (
          <Card key={c.key} className="p-4 text-center">
            <p className="text-[10px] font-semibold tracking-wider text-faint uppercase">{c.name.split(" ")[0]}</p>
            <p className="mt-1 text-3xl font-bold text-primary-text">{sub(c.key)}%</p>
            <p className="text-[11px] text-faint">Importancia: {c.weight}%</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader title="Evolución por rúbrica del equipo" subtitle="Tendencia combinada de las 4 sub-puntuaciones" />
        <div className="p-3">
          <MultiLine
            data={series}
            series={[
              { key: "apertura", name: "Apertura", color: RUBRIC_COLORS.apertura },
              { key: "diagnostico", name: "Presentación / Diagnóstico", color: RUBRIC_COLORS.diagnostico },
              { key: "objeciones", name: "Objeciones", color: RUBRIC_COLORS.objeciones },
              { key: "cierre", name: "Cierre", color: RUBRIC_COLORS.cierre },
            ]}
          />
        </div>
      </Card>

      <div ref={editRef}>
        <Card className="mt-4 scroll-mt-20">
          <CardHeader
            title="Criterios — Modo edición"
            subtitle="Ajusta cuánto pesa cada categoría en este tipo de llamada. El total debe sumar 100%."
            right={<span className={cn("text-xs font-semibold", total === 100 ? "text-good" : "text-bad")}>Total: {total}% {total === 100 ? "✓" : "✗"}</span>}
          />
          <div className="p-5">
            <Pills value={editType} onChange={setEditType} options={CALL_TYPES.map((c) => ({ value: c.id, label: c.short }))} />
            <div className="mt-4 space-y-2">
              {cats.map((c, i) => (
                <div key={c.key} className="flex items-center gap-3 rounded-xl bg-surface-2 p-4">
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold", LETTER_CLS[c.key])}>{c.name[0]}</span>
                  <div className="min-w-0 flex-1">
                    <input value={c.name} onChange={(e) => setField(i, "name", e.target.value)} className="w-full bg-transparent text-sm font-semibold text-text outline-none" />
                    <input value={c.description} onChange={(e) => setField(i, "description", e.target.value)} className="w-full bg-transparent text-xs text-muted outline-none" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setWeight(i, c.weight - 5)} className="grid size-6 place-items-center rounded border border-border bg-surface text-muted" aria-label="Restar">
                      <Minus className="size-3" />
                    </button>
                    <span className={cn("w-12 text-center text-sm font-bold", LETTER_CLS[c.key].split(" ")[1])}>{c.weight}%</span>
                    <button onClick={() => setWeight(i, c.weight + 5)} className="grid size-6 place-items-center rounded border border-border bg-surface text-muted" aria-label="Sumar">
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="primary"
                disabled={total !== 100 || !dirty}
                onClick={() => {
                  saveRubrics(draft);
                  toast("Criterios guardados. Las puntuaciones se han recalculado.");
                }}
              >
                Guardar cambios
              </Button>
              <Button onClick={() => setDraft(rubrics)} disabled={!dirty}>
                Cancelar
              </Button>
              {total !== 100 && <span className="text-xs text-bad">Ajusta los pesos hasta sumar 100%.</span>}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-faint">
              <Trash2 className="size-3" /> Los nombres y descripciones de cada categoría se envían a la IA como instrucciones de evaluación.
            </p>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Skills granulares del equipo" subtitle="Porcentaje de sesiones donde cada skill aparece como fortaleza (sobre las sesiones donde aplica)" />
        <div className="grid gap-x-8 gap-y-4 p-5 md:grid-cols-2">
          {skills.map((s) => (
            <div key={s.skill}>
              <div className="flex justify-between text-sm">
                <span className="text-text">{s.skill}</span>
                <span className="font-semibold text-text">{s.rate}%</span>
              </div>
              <ProgressBar value={s.rate} className="mt-1" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
