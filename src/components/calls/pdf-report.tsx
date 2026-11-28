"use client";

import { callTypeLabel, OUTCOMES } from "@/lib/catalog";
import type { RubricCategory, Session } from "@/lib/types";
import { formatLongDate, formatTime } from "@/lib/utils";

/*
 * Exportación a PDF de una sesión: solo la transcripción o el informe completo.
 * Se genera en el navegador con @react-pdf/renderer (se carga solo al exportar).
 * Los colores van en hexadecimal porque el PDF es un documento impreso, sin modo oscuro.
 * Más adelante: logo de la organización en la cabecera.
 */

const C = { text: "#292d3a", muted: "#606a70", faint: "#7d8a92", border: "#e6e8e9", brand: "#068667", soft: "#f2f3f4", good: "#009a71", warn: "#d36d00", bad: "#cc1f1a" };

export type PdfKind = "transcripcion" | "informe";

function fmtT(t: number) {
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

function scoreColor(v: number) {
  return v >= 70 ? C.good : v >= 50 ? C.warn : C.bad;
}

export async function downloadSessionPdf(session: Session, kind: PdfKind, ctx: { orgName: string; repName: string; rubric: RubricCategory[] }) {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
  const s = StyleSheet.create({
    page: { padding: 36, paddingBottom: 52, fontSize: 10, color: C.text, fontFamily: "Helvetica", lineHeight: 1.4 },
    brand: { fontSize: 9, color: C.brand, fontFamily: "Helvetica-Bold" },
    title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 4, lineHeight: 1.2 },
    meta: { fontSize: 9, color: C.muted, marginTop: 3 },
    h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 6, color: C.text },
    label: { fontSize: 8, color: C.faint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    p: { marginBottom: 4 },
    box: { borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 10, marginBottom: 8 },
    row: { flexDirection: "row", gap: 8 },
    pill: { fontSize: 8, color: C.muted, backgroundColor: C.soft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    line: { flexDirection: "row", gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.border },
    time: { width: 34, fontSize: 8, color: C.brand },
    who: { fontSize: 8, fontFamily: "Helvetica-Bold" },
    footerLeft: { position: "absolute", bottom: 24, left: 36, fontSize: 8, color: C.faint },
  });
  const a = session.analysis;
  const outcome = OUTCOMES.find((o) => o.id === session.outcome)?.label ?? session.outcome;
  const duration = session.durationSec ? fmtT(session.durationSec) : `${session.durationMin} min`;
  const generated = `${formatLongDate(new Date())}, ${formatTime(new Date())}`;

  const Header = () => (
    <View>
      <Text style={s.brand}>SPARRING IA{ctx.orgName ? ` · ${ctx.orgName}` : ""}</Text>
      <Text style={s.title}>{kind === "informe" ? "Informe de la sesión" : "Transcripción de la sesión"}</Text>
      <Text style={s.meta}>
        {session.prospectName} · {callTypeLabel(session.callType)} · {session.type === "roleplay" ? "Simulador IA" : "Llamada real"}
      </Text>
      <Text style={s.meta}>
        {formatLongDate(session.date)}, {formatTime(session.date)} · Comercial: {ctx.repName} · Duración: {duration} · Resultado: {outcome}
        {kind === "informe" ? ` · Puntuación: ${session.score}/100` : ""}
      </Text>
    </View>
  );

  const Transcript = () => (
    <View>
      <Text style={s.h2} minPresenceAhead={80}>Transcripción</Text>
      {session.transcript.length === 0 && <Text style={s.meta}>Esta sesión no tiene transcripción.</Text>}
      {session.transcript.map((l, i) => (
        <View key={i} style={s.line} wrap={false}>
          <Text style={s.time}>{fmtT(l.t)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.who, { color: l.speaker === "rep" ? C.brand : C.text }]}>
              {l.speaker === "rep" ? "Comercial" : "Prospecto"}
              {l.tone ? `  ·  Tono: ${l.tone}` : ""}
            </Text>
            <Text>{l.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const Block = ({ title, children }: { title: string; children?: string }) =>
    children ? (
      <View style={s.box} wrap={false}>
        <Text style={s.label}>{title}</Text>
        <Text>{children}</Text>
      </View>
    ) : null;

  const Report = () => (
    <View>
      <Text style={s.h2} minPresenceAhead={80}>Puntuación por criterio</Text>
      <View style={s.box}>
        {ctx.rubric.map((c) => {
          const v = session.subScores[c.key];
          return (
            <View key={c.key} style={[s.row, { justifyContent: "space-between", marginBottom: 3 }]}>
              <Text>
                {c.name} <Text style={{ color: C.faint }}>({c.weight}%)</Text>
              </Text>
              <Text style={{ fontFamily: "Helvetica-Bold", color: scoreColor((v / 25) * 100) }}>{v}/25</Text>
            </View>
          );
        })}
        <View style={[s.row, { justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.border, paddingTop: 4, marginTop: 2 }]}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Puntuación global</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", color: scoreColor(session.score) }}>{session.score}/100</Text>
        </View>
      </View>
      {a && (
        <>
          <Text style={s.h2} minPresenceAhead={80}>Resumen</Text>
          <Block title="Contexto">{a.context}</Block>
          <Block title="Impresión general">{a.overall}</Block>
          <Block title="Fortalezas observadas">{a.strengths}</Block>
          <Block title="Respuesta del cliente">{a.clientResponse}</Block>
          <Text style={s.h2} minPresenceAhead={80}>Feedback</Text>
          <Block title="Feedback global">{a.globalFeedback}</Block>
          <Block title={`Prioridad (${a.prioritySkill})`}>{a.priority}</Block>
          <Block title="Fallo principal">{a.mainFailure}</Block>
          {a.developmentAreas.length > 0 && (
            <View style={s.box}>
              <Text style={s.label}>Áreas de desarrollo</Text>
              {a.developmentAreas.map((d, i) => (
                <View key={i} style={{ marginBottom: 4 }} wrap={false}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.skill}</Text>
                  <Text style={{ color: C.muted }}>«{d.quote}»</Text>
                  <Text>{d.impact}</Text>
                </View>
              ))}
            </View>
          )}
          {a.missedOpportunities.length > 0 && (
            <View style={s.box}>
              <Text style={s.label}>Oportunidades perdidas</Text>
              {a.missedOpportunities.map((m, i) => (
                <Text key={i} style={s.p}>• {m}</Text>
              ))}
            </View>
          )}
          {a.levers.length > 0 && (
            <View style={s.box}>
              <Text style={s.label}>Palancas para la próxima vez</Text>
              {a.levers.map((m, i) => (
                <Text key={i} style={s.p}>• {m}</Text>
              ))}
            </View>
          )}
          <Block title="Siguiente paso">{a.nextStep}</Block>
          {a.tone && (
            <View style={s.box} wrap={false}>
              <Text style={s.label}>Tono de la llamada</Text>
              <Text>
                Ratio de habla: {a.tone.talkRatio}% · Pausas largas: {a.tone.pauses} · Energía: {a.tone.energy}% · Cercanía: {a.tone.warmth}% · Control: {a.tone.control}%
              </Text>
            </View>
          )}
        </>
      )}
      {session.objections.length > 0 && (
        <>
          <Text style={s.h2} minPresenceAhead={80}>Objeciones detectadas</Text>
          {session.objections.map((o, i) => (
            <View key={i} style={s.box} wrap={false}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{o.category}</Text>
                <Text style={{ color: o.quality === "bien" ? C.good : o.quality === "regular" ? C.warn : C.bad, fontFamily: "Helvetica-Bold" }}>{o.quality.toUpperCase()}</Text>
              </View>
              <Text style={{ color: C.muted }}>«{o.quote}»</Text>
              <Text style={{ marginTop: 3 }}>Pregunta clave sugerida: {o.script.keyQuestion}</Text>
            </View>
          ))}
        </>
      )}
      {session.moments.length > 0 && (
        <>
          <Text style={s.h2} minPresenceAhead={80}>Momentos clave</Text>
          {session.moments.map((m, i) => (
            <View key={i} style={s.box} wrap={false}>
              <Text style={{ fontFamily: "Helvetica-Bold", color: m.kind === "fuerte" ? C.good : C.bad }}>
                {m.kind === "fuerte" ? "Fuerte" : "A mejorar"} · {m.title}
              </Text>
              <Text style={{ color: C.muted }}>«{m.repQuote}»</Text>
              <Text>Sugerencia: {m.suggestion}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );

  const doc = (
    <Document title={`${kind === "informe" ? "Informe" : "Transcripción"} · ${session.prospectName}`} author="Sparring IA">
      <Page size="A4" style={s.page}>
        <Header />
        {kind === "informe" && <Report />}
        <Transcript />
        <Text style={s.footerLeft} fixed>
          Generado con Sparring IA · {generated}
        </Text>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safe = session.prospectName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  link.href = url;
  link.download = `${kind === "informe" ? "informe" : "transcripcion"}-${safe || "sesion"}-${session.date.toISOString().slice(0, 10)}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
