/*
 * Novedades de Sparring IA. La entrada más reciente va PRIMERO.
 * Cada vez que se publica un cambio de funciones, se añade aquí una entrada con un `id` nuevo:
 * al entrar, cada usuario ve la ventana de novedades una vez (y puede reabrirla desde la barra superior).
 * Escribe para el comercial, no para el programador: qué puede hacer ahora y dónde.
 */

export interface ChangelogEntry {
  /** Identificador único y creciente (fecha + sufijo), p. ej. "2026-11-28b". */
  id: string;
  date: string;
  title: string;
  items: { title: string; text: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "2026-11-28b",
    date: "2026-11-28",
    title: "Análisis de tu voz y detección de enojo",
    items: [
      { title: "Tu voz, analizada en vivo", text: "El simulador mide cómo suena tu voz (no solo lo que dices): voz temblorosa, frases que terminan como pregunta, tono monótono o expresivo. Las etiquetas salen en verde, ámbar o rojo." },
      { title: "Detección de enojo", text: "Si subes el tono, reprochas o te impacientas, verás un aviso durante la llamada y el análisis incluirá el área «Control emocional»." },
      { title: "Cliente B2C desde tu web", text: "Al importar un cliente B2C con la web de tu negocio, el cliente se interesa por uno de tus productos o servicios concretos." },
    ],
  },
  {
    id: "2026-11-28a",
    date: "2026-11-28",
    title: "Prospectos más realistas",
    items: [
      { title: "Lo que vende de verdad", text: "Al crear un prospecto desde una web se leen sus productos y servicios reales (con precio si lo publica), sin botones ni redes sociales." },
      { title: "Tono más preciso", text: "El tono de cada intervención tiene en cuenta muletillas, tartamudeos, ritmo y pausas." },
    ],
  },
];

export const LATEST_CHANGELOG_ID = CHANGELOG[0]?.id ?? "";
