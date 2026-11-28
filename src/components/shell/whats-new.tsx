"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Modal } from "@/components/ui";
import { CHANGELOG, LATEST_CHANGELOG_ID } from "@/lib/changelog";
import { formatLongDate } from "@/lib/utils";

const KEY = "sparring:novedades-vistas";

function readSeen() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return LATEST_CHANGELOG_ID; // sin almacenamiento no insistimos en cada visita
  }
}

function markSeen() {
  try {
    localStorage.setItem(KEY, LATEST_CHANGELOG_ID);
  } catch {
    /* almacenamiento no disponible */
  }
}

/**
 * Ventana de novedades: se abre sola una vez tras cada actualización y se puede reabrir con el botón de la barra superior.
 * En producción: guardar la última novedad vista en el perfil del usuario (Supabase) para que siga entre dispositivos.
 */
export function WhatsNew() {
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(false);

  useEffect(() => {
    if (!LATEST_CHANGELOG_ID) return;
    const seen = readSeen();
    if (seen === LATEST_CHANGELOG_ID) return;
    setUnseen(true);
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setOpen(false);
    setUnseen(false);
    markSeen();
  }

  const seenBefore = typeof window === "undefined" ? "" : readSeen();
  const latestIndex = CHANGELOG.findIndex((e) => e.id === seenBefore);
  // Se muestran las novedades que el usuario aún no ha visto (como mínimo la última) y, debajo, las anteriores.
  const fresh = latestIndex > 0 ? CHANGELOG.slice(0, latestIndex) : CHANGELOG.slice(0, 1);
  const older = CHANGELOG.slice(fresh.length, fresh.length + 3);

  if (!CHANGELOG.length) return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
        aria-label="Novedades"
        title="Novedades"
      >
        <Sparkles className="size-4" />
        {unseen && <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" />}
      </button>
      <Modal
        open={open}
        onClose={close}
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> Novedades de Sparring IA
          </span>
        }
        subtitle="Esto es lo que ha cambiado desde tu última visita."
        footer={
          <Button variant="primary" onClick={close}>
            Entendido
          </Button>
        }
      >
        <div className="space-y-5">
          {fresh.map((e) => (
            <section key={e.id}>
              <p className="text-xs text-faint">{formatLongDate(new Date(`${e.date}T12:00:00`))}</p>
              <h3 className="mt-0.5 font-semibold text-text">{e.title}</h3>
              <ul className="mt-2 space-y-2">
                {e.items.map((it) => (
                  <li key={it.title} className="rounded-lg bg-surface-2 p-3">
                    <p className="text-sm font-medium text-text">{it.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{it.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {older.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted hover:text-text">Novedades anteriores</summary>
              <div className="mt-2 space-y-3">
                {older.map((e) => (
                  <div key={e.id}>
                    <p className="font-medium text-text">{e.title}</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
                      {e.items.map((it) => (
                        <li key={it.title}>{it.title}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </Modal>
    </>
  );
}
