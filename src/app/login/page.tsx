"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/shell/logo";
import { Button, Card, Segmented } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";

type Mode = "entrar" | "registro" | "recuperar";

const input = "mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";

/** Traduce los errores más habituales de Supabase Auth. */
function friendly(message: string) {
  if (/invalid login credentials/i.test(message)) return "Email o contraseña incorrectos.";
  if (/email not confirmed/i.test(message)) return "Confirma tu email: revisa tu bandeja de entrada (y la carpeta de spam).";
  if (/already registered|already exists/i.test(message)) return "Ya existe una cuenta con ese email. Entra o recupera tu contraseña.";
  if (/password should be at least|weak password/i.test(message)) return "La contraseña debe tener al menos 8 caracteres.";
  if (/rate limit|too many/i.test(message)) return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  return message;
}

function LoginInner() {
  const params = useSearchParams();
  const supabase = getSupabase();
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(params.get("error") ?? "");
  const [info, setInfo] = useState("");

  if (!supabase) {
    return (
      <Shell>
        <p className="text-sm text-muted">La plataforma está en <b className="text-text">modo demo</b>: no hace falta iniciar sesión.</p>
        <Link href="/simulador" className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-on-primary">
          Entrar a la demo
        </Link>
      </Shell>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");
    setInfo("");
    const origin = window.location.origin;
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/simulador";
        return;
      }
      if (mode === "registro") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, org_name: orgName }, emailRedirectTo: `${origin}/auth/callback?next=/simulador` },
        });
        if (error) throw error;
        if (data.session) {
          window.location.href = "/simulador";
          return;
        }
        setInfo("Te enviamos un correo para confirmar tu cuenta. Ábrelo y pulsa el enlace para entrar.");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/auth/nueva-contrasena` });
      if (error) throw error;
      setInfo("Si el email tiene una cuenta, recibirás un enlace para crear una nueva contraseña.");
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : "No se pudo completar la operación."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      {mode !== "recuperar" && (
        <Segmented
          className="mb-5 w-full"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError("");
            setInfo("");
          }}
          options={[
            { value: "entrar", label: "Entrar" },
            { value: "registro", label: "Crear cuenta" },
          ]}
        />
      )}
      {mode === "recuperar" && <p className="mb-4 text-sm text-muted">Escribe tu email y te enviaremos un enlace para crear una nueva contraseña.</p>}
      <form onSubmit={submit} className="space-y-3">
        {mode === "registro" && (
          <>
            <label className="block text-xs text-muted">
              Tu nombre
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </label>
            <label className="block text-xs text-muted">
              Nombre de tu empresa
              <input className={input} value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder="Será el nombre de tu organización en Sparring IA" />
            </label>
          </>
        )}
        <label className="block text-xs text-muted">
          Email
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        {mode !== "recuperar" && (
          <label className="block text-xs text-muted">
            Contraseña
            <input
              className={input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === "entrar" ? "current-password" : "new-password"}
            />
            {mode === "registro" && <span className="mt-1 block text-[11px] text-faint">Mínimo 8 caracteres.</span>}
          </label>
        )}
        {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad">{error}</p>}
        {info && <p className="rounded-lg bg-good-soft px-3 py-2 text-xs text-good">{info}</p>}
        <Button variant="primary" type="submit" disabled={loading} className="h-10 w-full">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {mode === "entrar" ? "Entrar" : mode === "registro" ? "Crear cuenta" : "Enviar enlace"}
        </Button>
      </form>
      <div className="mt-4 text-center text-xs">
        {mode === "entrar" && (
          <button className="text-primary-text hover:underline" onClick={() => setMode("recuperar")}>
            ¿Olvidaste tu contraseña?
          </button>
        )}
        {mode === "recuperar" && (
          <button className="text-primary-text hover:underline" onClick={() => setMode("entrar")}>
            ← Volver a entrar
          </button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo className="size-12" />
          <h1 className="text-xl font-semibold text-text">Sparring IA</h1>
          <p className="text-sm text-muted">Entrenamiento comercial con IA</p>
        </div>
        <Card className="p-6">{children}</Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
