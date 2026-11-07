"use client";

import { Phone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useApp } from "@/components/app-state";
import { CallDetail } from "@/components/calls/detail";
import { Library, type LibTab } from "@/components/calls/library";
import { UploadPanel } from "@/components/calls/upload";
import { Empty } from "@/components/ui";
import { cn } from "@/lib/utils";

function LlamadasInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { sessions } = useApp();
  const id = params.get("id");
  const session = sessions.find((s) => s.id === id) ?? null;
  const [tab, setTab] = useState<LibTab>(params.get("tab") === "subir" ? "subir" : session?.type === "roleplay" ? "roleplay" : "real");

  useEffect(() => {
    if (params.get("tab") === "subir") setTab("subir");
  }, [params]);
  useEffect(() => {
    if (session && tab !== "subir") setTab(session.type);
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (sid: string) => router.push(`/llamadas?id=${sid}`, { scroll: false });
  const showDetail = tab !== "subir" && session;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <aside className={cn("w-full shrink-0 border-r border-border bg-surface md:w-80", (showDetail || tab === "subir") && "hidden md:block")}>
        <Library
          tab={tab}
          setTab={(t) => {
            setTab(t);
            if (t === "subir") router.push("/llamadas?tab=subir", { scroll: false });
          }}
          selectedId={id}
          onSelect={select}
        />
      </aside>
      <section className={cn("min-w-0 flex-1 overflow-y-auto", !showDetail && tab !== "subir" && "hidden md:block")}>
        {tab === "subir" ? (
          <UploadPanel
            onCreated={(newId) => {
              setTab("real");
              select(newId);
            }}
          />
        ) : session ? (
          <CallDetail session={session} onBack={() => router.push("/llamadas", { scroll: false })} />
        ) : (
          <Empty icon={<Phone className="size-8" />} title="Selecciona una llamada" text="Elige una sesión de la biblioteca para ver su análisis completo, o sube una nueva llamada." />
        )}
      </section>
    </div>
  );
}

export default function LlamadasPage() {
  return (
    <Suspense>
      <LlamadasInner />
    </Suspense>
  );
}
