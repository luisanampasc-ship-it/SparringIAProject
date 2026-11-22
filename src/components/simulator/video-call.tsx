"use client";

/* eslint-disable @next/next/no-img-element */
import { Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Face } from "@/components/persona-face";
import type { Persona } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Vista de videollamada: el prospecto en grande con la cara animada (boca según el volumen
 * de su voz, parpadeo y ligero movimiento) y, en una esquina, la cámara del comercial.
 * Opción gratuita; más adelante se puede sustituir por un avatar realista en tiempo real.
 */
export function VideoCallView({ persona, speaking, getLevel, status }: { persona: Persona; speaking: boolean; getLevel: () => number; status: string }) {
  const [mouth, setMouth] = useState(0);
  const [blink, setBlink] = useState(false);
  const [bob, setBob] = useState(0);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  // Animación: boca según el volumen de la voz del prospecto y ligero movimiento de cabeza.
  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    const loop = (t: number) => {
      const target = speakingRef.current ? Math.min(1, getLevel() * 2.2) : 0;
      smooth += (target - smooth) * 0.35;
      setMouth(smooth < 0.05 ? 0 : smooth);
      setBob(Math.sin(t / 900) * (speakingRef.current ? 1.6 : 0.8));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getLevel]);

  // Parpadeo cada 3-5 segundos.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        schedule();
      }, 3000 + Math.random() * 2000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-sidebar">
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative" style={{ transform: `translateY(${bob}px)` }}>
          {speaking && <span className="pulse-ring absolute inset-0 rounded-full bg-primary/60" />}
          <span className={cn("relative block size-40 overflow-hidden rounded-full ring-4 transition sm:size-48", speaking ? "ring-primary" : "ring-white/10")}>
            {persona.photo ? (
              <img src={persona.photo} alt={persona.name} className="size-full object-cover" style={{ transform: `scale(${1 + mouth * 0.03})` }} />
            ) : (
              <Face seed={persona.name} gender={persona.gender} mouth={mouth} blink={blink} className="size-full" />
            )}
          </span>
        </div>
      </div>
      <div className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-1 text-[11px] text-white">
        {persona.name} · {status}
      </div>
      <SelfView />
    </div>
  );
}

/** Cámara del comercial (opcional): solo se muestra en su pantalla, no se graba ni se envía. */
function SelfView() {
  const [on, setOn] = useState(false);
  const [error, setError] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!on) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => {
        setError(true);
        setOn(false);
      });
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, [on]);

  return (
    <div className="absolute right-2 bottom-2 h-20 w-28 overflow-hidden rounded-lg border border-white/20 bg-black/60">
      {on ? (
        <video ref={video} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-[10px] text-white/70">{error ? "Cámara no disponible" : "Tu cámara"}</div>
      )}
      <button
        onClick={() => setOn((v) => !v)}
        className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"
        aria-label={on ? "Apagar cámara" : "Encender cámara"}
      >
        {on ? <VideoOff className="size-3.5" /> : <Video className="size-3.5" />}
      </button>
    </div>
  );
}
