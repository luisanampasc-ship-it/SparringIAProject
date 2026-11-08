"use client";

import { Pause, Play } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface PlayerHandle {
  seek: (seconds: number) => void;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Reproductor con forma de onda. Si hay audioUrl reproduce el archivo real;
 * si no (datos demo), simula la reproducción con la duración de la sesión.
 */
export const WaveformPlayer = forwardRef<PlayerHandle, { audioUrl?: string; durationSec: number; seed: string }>(function WaveformPlayer({ audioUrl, durationSec, seed }, ref) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(durationSec);

  const bars = useMemo(() => {
    let h = 0;
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return Array.from({ length: 90 }, (_, i) => {
      h = (h * 1103515245 + 12345) >>> 0;
      return 0.2 + ((h % 1000) / 1000) * 0.8 * (0.6 + 0.4 * Math.sin(i / 5));
    });
  }, [seed]);

  useEffect(() => {
    setTime(0);
    setPlaying(false);
    setDuration(durationSec);
  }, [seed, durationSec]);

  useEffect(() => {
    if (!playing || audioUrl) return;
    const id = setInterval(() => {
      setTime((t) => {
        if (t + 1 >= duration) {
          setPlaying(false);
          return duration;
        }
        return t + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, audioUrl, duration]);

  const seek = (s: number) => {
    const v = Math.max(0, Math.min(duration, s));
    setTime(v);
    if (audio.current) audio.current.currentTime = v;
  };
  useImperativeHandle(ref, () => ({
    seek: (s) => {
      seek(s);
      if (audio.current) audio.current.play();
      setPlaying(true);
    },
  }));

  const toggle = () => {
    if (audio.current) {
      if (playing) audio.current.pause();
      else audio.current.play();
    }
    setPlaying((p) => !p);
  };

  const progress = duration ? time / duration : 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      {audioUrl && (
        <audio
          ref={audio}
          src={audioUrl}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => setPlaying(false)}
        />
      )}
      <button onClick={toggle} className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-on-primary" aria-label={playing ? "Pausar" : "Reproducir"}>
        {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
      </button>
      <span className="w-10 text-xs text-muted tabular-nums">{fmt(time)}</span>
      <div
        className="flex h-10 flex-1 cursor-pointer items-center gap-[2px]"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          seek(((e.clientX - r.left) / r.width) * duration);
        }}
      >
        {bars.map((b, i) => (
          <span key={i} className={cn("flex-1 rounded-full", i / bars.length < progress ? "bg-primary" : "bg-primary/25")} style={{ height: `${b * 100}%` }} />
        ))}
      </div>
      <span className="w-10 text-right text-xs text-muted tabular-nums">{fmt(duration)}</span>
    </div>
  );
});
