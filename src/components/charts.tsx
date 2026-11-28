"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const axis = { fontSize: 11, fill: "var(--faint)" };

const tooltipStyle = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--text)",
  },
  labelStyle: { color: "var(--muted)", marginBottom: 4 },
};

export function TrendArea({ data, unit = "%", height = 240, band = false }: { data: { day: string; value: number; min?: number; max?: number }[]; unit?: string; height?: number; band?: boolean }) {
  const rows = data.map((d) => ({ ...d, range: band ? [d.min ?? d.value, d.max ?? d.value] : undefined }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} domain={unit === "%" ? [0, 100] : [0, "auto"]} tickFormatter={(v) => (unit === "%" ? `${v}%` : String(v))} />
        <Tooltip {...tooltipStyle} formatter={(v) => (Array.isArray(v) ? `${v[0]}–${v[1]}` : `${v}${unit === "%" ? "%" : ""}`)} />
        {band && <Area type="monotone" dataKey="range" stroke="none" fill="var(--primary)" fillOpacity={0.1} name="Rango del equipo" />}
        <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill={band ? "none" : "url(#trend-fill)"} dot={{ r: 3, fill: "var(--primary)" }} activeDot={{ r: 5 }} name="Valor" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiLine({ data, series, height = 280 }: { data: Record<string, number | string>[]; series: { key: string; name: string; color: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 2.5 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, width = 70, height = 22, color = "var(--primary)" }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - 2 - ((v - min) / (max - min || 1)) * (height - 4)}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Barras agrupadas: una barra por serie (p. ej. por integrante) en cada categoría. Valores en %. */
export function GroupedBars({ data, series, height = 260, layout = "horizontal" }: { data: Record<string, number | string>[]; series: { key: string; name: string; color: string }[]; height?: number; layout?: "horizontal" | "vertical" }) {
  const vertical = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={vertical ? "vertical" : "horizontal"} margin={{ top: 10, right: 16, left: vertical ? 40 : -18, bottom: 0 }} barGap={2}>
        <CartesianGrid horizontal={!vertical} vertical={vertical} stroke="var(--border)" strokeDasharray="3 3" />
        {vertical ? (
          <>
            <XAxis type="number" domain={[0, 100]} tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="label" width={130} tick={axis} axisLine={false} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          </>
        )}
        <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} cursor={{ fill: "var(--surface-2)" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
