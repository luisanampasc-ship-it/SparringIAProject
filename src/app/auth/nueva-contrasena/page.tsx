"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/shell/logo";
import { Button, Card } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";

/** Crear o cambiar la contraseña (al aceptar una invitación o tras "¿Olvidaste tu contraseña?"). */
export default function NuevaContrasenaPage() {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== repeat) return setError("Las contraseñas no coinciden.");
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(/at least|weak/i.test(error.message) ? "La contraseña debe tener al menos 8 caracteres." : "No se pudo guardar la contraseña. Vuelve a abrir el enlace del correo.");
    window.location.href = "/simulador";
  }

  const input = "mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <main className="grid min-h-screen place-items-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo className="size-12" />
          <h1 className="text-xl font-semibold text-text">Crea tu contraseña</h1>
          <p className="text-sm text-muted">La usarás para entrar a Sparring IA.</p>
        </div>
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs text-muted">
              Nueva contraseña
              <input className={input} type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </label>
            <label className="block text-xs text-muted">
              Repítela
              <input className={input} type="password" minLength={8} required value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
            </label>
            {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad">{error}</p>}
            <Button variant="primary" type="submit" disabled={loading} className="h-10 w-full">
              {loading && <Loader2 className="size-4 animate-spin" />} Guardar y entrar
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
