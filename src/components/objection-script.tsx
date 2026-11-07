import type { ObjectionScript as Script } from "@/lib/types";

export function ObjectionScript({ script, label }: { script: Script; label?: string }) {
  return (
    <div className="rounded-lg border-l-2 border-primary bg-surface p-4">
      {label && <p className="mb-2 text-[10px] font-semibold tracking-wider text-faint uppercase">{label}</p>}
      <p className="mb-3 rounded-md bg-surface-2 px-3 py-1.5 text-xs text-muted italic">
        El prospecto dijo: <span className="text-text">&ldquo;{script.quote}&rdquo;</span>
      </p>
      <Step n={1} title="Pregunta clave">
        <p>{script.keyQuestion}</p>
      </Step>
      <Step n={2} title="Según respuesta">
        <div className="space-y-2">
          {script.branches.map((b) => (
            <div key={b.ifAnswer}>
              <p className="text-[10px] font-bold tracking-wider text-primary-text uppercase">Si responde: {b.ifAnswer}</p>
              <p>{b.reply}</p>
            </div>
          ))}
        </div>
      </Step>
      <Step n={3} title="Cierre" last>
        <p>{script.close}</p>
      </Step>
    </div>
  );
}

function Step({ n, title, children, last }: { n: number; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="relative flex gap-3 pb-3">
      {!last && <span className="absolute top-6 bottom-0 left-[9px] w-px bg-border" />}
      <span className="z-10 grid size-5 shrink-0 place-items-center rounded-full bg-warn-soft text-[10px] font-bold text-warn">{n}</span>
      <div className="flex-1 text-sm leading-relaxed text-text">
        <p className="mb-0.5 text-[10px] font-bold tracking-wider text-warn uppercase">{title}</p>
        {children}
      </div>
    </div>
  );
}
