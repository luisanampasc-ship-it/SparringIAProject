"use client";

import { Check, Copy, Plug } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Badge, Button, Card, Modal, PageHeader } from "@/components/ui";
import { INTEGRATIONS } from "@/lib/catalog";
import type { Integration } from "@/lib/types";

export default function IntegracionesPage() {
  const { toast } = useApp();
  const [items, setItems] = useState(INTEGRATIONS);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const categories = [...new Set(items.map((i) => i.category))];

  const toggle = (it: Integration) => {
    if (it.id === "webhook") return setWebhookOpen(true);
    setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, connected: !x.connected } : x)));
    toast(it.connected ? `${it.name} desconectado` : `${it.name} conectado (demo)`);
  };

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      <PageHeader title="Integraciones" subtitle="Conecta tus herramientas para importar llamadas automáticamente y sincronizar resultados." />
      {categories.map((cat) => (
        <div key={cat} className="mb-6">
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-faint uppercase">{cat}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items
              .filter((i) => i.category === cat)
              .map((it) => (
                <Card key={it.id} className="flex flex-col p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-sm font-bold text-primary-text">{it.name.slice(0, 2)}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-text">{it.name}</p>
                      {it.connected ? <Badge className="bg-good-soft text-good"><Check className="size-3" /> Conectado</Badge> : <Badge className="bg-surface-2 text-muted">No conectado</Badge>}
                    </div>
                  </div>
                  <p className="mt-3 flex-1 text-xs text-muted">{it.description}</p>
                  <Button size="sm" variant={it.connected ? "secondary" : "primary"} className="mt-4" onClick={() => toggle(it)}>
                    <Plug className="size-3.5" /> {it.id === "webhook" ? "Ver credenciales" : it.connected ? "Desconectar" : "Conectar"}
                  </Button>
                </Card>
              ))}
          </div>
        </div>
      ))}

      <Modal open={webhookOpen} onClose={() => setWebhookOpen(false)} title="Webhook / API" subtitle="Envía audios o transcripciones desde cualquier sistema.">
        <p className="mb-1 text-xs text-muted">Endpoint</p>
        <CopyField value="https://TU-DOMINIO.vercel.app/api/ingest" />
        <p className="mt-3 mb-1 text-xs text-muted">API key (demo)</p>
        <CopyField value="sk_sparring_demo_9f3a7c21" />
        <pre className="mt-4 overflow-x-auto rounded-lg bg-surface-2 p-3 text-[11px] text-text">{`curl -X POST https://TU-DOMINIO.vercel.app/api/ingest \\
  -H "Authorization: Bearer sk_sparring_demo_9f3a7c21" \\
  -H "Content-Type: application/json" \\
  -d '{"callType":"videollamada","prospect":"Ana","transcript":"..."}'`}</pre>
      </Modal>
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const { toast } = useApp();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
      <code className="flex-1 truncate text-xs text-text">{value}</code>
      <button onClick={() => navigator.clipboard?.writeText(value).then(() => toast("Copiado"))} aria-label="Copiar">
        <Copy className="size-3.5 text-muted" />
      </button>
    </div>
  );
}
