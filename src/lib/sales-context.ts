import type { CompanySize } from "./types";

/*
 * Reglas para adaptar el prospecto a lo que vende el comercial y al tamaño de la empresa.
 * Se usan cuando no hay IA disponible; con IA, Claude recibe la misma información y decide.
 */

export const SIZE_LABEL: Record<CompanySize, string> = { pyme: "Pyme", mediana: "Mediana empresa", grande: "Gran empresa" };

const AREAS: { re: RegExp; area: string; kpi: string; specific: string }[] = [
  { re: /(formaci[oó]n|capacitaci[oó]n|curso|coaching|entrenamiento|ventas consultivas|talento|liderazgo)/i, area: "Desarrollo Comercial y Capacitación", kpi: "la productividad del equipo comercial", specific: "Mi equipo ya recibió capacitaciones y no vimos resultados" },
  { re: /(software|crm|erp|plataforma|saas|app|tecnolog|nube|cloud|ciberseguridad|datos|inteligencia artificial)/i, area: "Tecnología", kpi: "la eficiencia operativa", specific: "Integrarlo con nuestros sistemas es complicado" },
  { re: /(marketing|publicidad|redes sociales|branding|dise[ñn]o|contenido|seo)/i, area: "Marketing", kpi: "la captación de clientes", specific: "Ya tenemos una agencia que lleva esto" },
  { re: /(seguro|beneficio|salud ocupacional|bienestar|n[oó]mina|planilla|reclutamiento|selecci[oó]n)/i, area: "Recursos Humanos", kpi: "la retención del personal", specific: "Los beneficios ya están definidos para este año" },
  { re: /(log[ií]stica|transporte|env[ií]o|almac[eé]n|distribuci[oó]n|flota)/i, area: "Operaciones y Logística", kpi: "los costes y tiempos de entrega", specific: "Cambiar de proveedor logístico es arriesgado ahora" },
  { re: /(contabilidad|finanzas|auditor|tributar|impuestos|factura|cobranza)/i, area: "Finanzas", kpi: "el control del gasto", specific: "Necesito ver el retorno con números antes de nada" },
  { re: /(limpieza|mantenimiento|seguridad privada|vigilancia|instalaciones|mobiliario|oficina)/i, area: "Administración y Servicios Generales", kpi: "el coste de los servicios", specific: "Ya tenemos contrato vigente con otro proveedor" },
];

/** Cargo del interlocutor según lo que vendes y el tamaño de la empresa. */
export function buyerFor(offer: string, size: CompanySize) {
  const match = AREAS.find((a) => a.re.test(offer));
  if (size === "pyme") return { role: "Dueño o gerente general", area: match?.area ?? "Dirección", kpi: match?.kpi ?? "las ventas del negocio", specific: match?.specific };
  if (!match) return { role: size === "grande" ? "Jefe de Compras" : "Gerente general", area: "Compras", kpi: "la relación calidad-precio", specific: undefined };
  return { role: `${size === "grande" ? "Gerente" : "Jefe"} de ${match.area}`, area: match.area, kpi: match.kpi, specific: match.specific };
}

export function objectionsFor(offer: string, size: CompanySize) {
  const specific = buyerFor(offer, size).specific;
  const bySize: Record<CompanySize, string[]> = {
    grande: ["Trabajamos con proveedores homologados", "Esto tiene que pasar por el área de Compras", "Envíame una propuesta formal y la revisamos en comité"],
    mediana: ["Ya trabajamos con otro proveedor", "No es prioridad este trimestre", "¿Cuánto cuesta? No tenemos mucho presupuesto"],
    pyme: ["Ahora mismo no tengo presupuesto", "Esto lo puedo hacer yo mismo", "Déjame pensarlo y te digo algo"],
  };
  return [...(specific ? [specific] : []), ...bySize[size]].slice(0, 3);
}

export function personalityFor(size: CompanySize) {
  return {
    grande: "Analítico y formal; pide datos, casos de empresas similares y respeta los procesos internos.",
    mediana: "Práctico y ocupado; quiere saber rápido qué gana su empresa y cuánto cuesta.",
    pyme: "Cercano pero prudente con el dinero; decide rápido si ve un beneficio claro.",
  }[size];
}

/** Tamaño aproximado a partir del texto de la web. */
export function detectSize(text: string): CompanySize {
  if (/(sucursales|agencias en todo|relaci[oó]n con (inversionistas|inversores)|investor relations|memoria anual|accionistas|presencia en \d+ pa[ií]ses|grupo [A-Z]|S\.A\.A\.|millones de clientes|multinacional|corporativo)/i.test(text)) return "grande";
  if (/(empresa familiar|peque[ñn]o negocio|emprendimiento|nuestro taller|somos un equipo peque[ñn]o)/i.test(text)) return "pyme";
  return "mediana";
}
