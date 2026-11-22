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

/*
 * Vocabulario de productos por rubro: sin IA, solo se aceptan como "lo que vende" las
 * etiquetas del menú que nombran productos típicos del rubro detectado.
 */
const PRODUCT_VOCAB: Record<string, RegExp> = {
  "Banca y finanzas": /(cuentas?|ahorros?|tarjetas?|pr[eé]stamos?|cr[eé]ditos?|hipotecari|vehicular|dep[oó]sitos?|plazo fijo|inversi[oó]n|inversiones|fondos|leasing|factoring|cambio de (moneda|divisas)|transferencias|cts|seguros?|banca (digital|por internet|m[oó]vil)|remesas|confirming|comercio exterior|carta fianza)/i,
  Seguros: /(seguros?|vida|salud|vehicular|hogar|soat|accidentes|sepelio|eps|rentas?|jubilaci[oó]n)/i,
  Telecomunicaciones: /(planes?|postpago|prepago|internet|fibra|hogar|televisi[oó]n|cable|tel[eé]fonos?|equipos|celulares|portabilidad|roaming|chip)/i,
  Automotriz: /(autos?|carros?|veh[ií]culos?|camionetas?|suv|seminuevos?|repuestos|servicio t[eé]cnico|taller|financiamiento|modelos)/i,
  "Inmobiliario y construcción": /(departamentos?|casas?|lotes?|terrenos?|oficinas|locales|proyectos?|alquiler|venta)/i,
  "Hostelería y restauración": /(carta|men[uú]|delivery|reservas?|habitaciones|eventos|catering|desayunos?|almuerzos?)/i,
  Salud: /(consultas?|especialidades|ex[aá]menes|an[aá]lisis|laboratorio|emergencias|planes de salud|chequeos?|odontolog|cirug)/i,
  Tecnología: /(software|plataforma|soluciones|cloud|nube|ciberseguridad|licencias|servidores|soporte|integraci[oó]n|desarrollo|consultor[ií]a ti|datos)/i,
  "Educación y formación": /(carreras?|cursos?|maestr[ií]as?|diplomados?|posgrados?|programas?|admisi[oó]n|becas|talleres)/i,
  "Retail y comercio": /(ropa|calzado|electro|hogar|tecnolog[ií]a|muebles|juguetes|belleza|deportes|ofertas|marcas|supermercado)/i,
  "Logística y transporte": /(env[ií]os?|courier|carga|almacenaje|almacenes|distribuci[oó]n|aduanas|transporte|flota|rastreo)/i,
  "Energía y minería": /(electricidad|gas|combustibles?|energ[ií]a|minerales|lubricantes|solar)/i,
  "Servicios profesionales": /(consultor[ií]a|asesor[ií]a|auditor[ií]a|legal|tributari|contable|laboral|corporativo)/i,
  "Fitness y deporte": /(planes?|membres[ií]as?|clases|entrenamiento|nutrici[oó]n|sedes)/i,
};

/** Siempre fuera de "lo que vende": canales, empleo, información corporativa, apps… */
export const NOT_PRODUCT = /(descarga|app\b|aplicaci[oó]n m[oó]vil|trabaj[ao] con nosotros|empleo|carreras profesionales|bolsa de trabajo|informaci[oó]n financiera|inversionistas|inversores|memoria|estados financieros|sostenibilidad|transparencia|gobierno corporativo|canal de|tasas y tarifas|tarifario|sobre |acerca|sucursales|oficinas y|agencias|cajeros|red de|beneficios para|promociones|novedades|eventos|noticias|prensa|adjudicados|remates|subastas|notariales|reclamos|seguridad|fraude|educaci[oó]n financiera|simulador|calculadora|tipo de cambio|horarios|ubica|cont[aá]ct)/i;

/** Productos típicos por rubro que se buscan en todo el texto cuando el menú no los nombra. */
const CANONICAL: Record<string, [string, RegExp][]> = {
  "Banca y finanzas": [
    ["Cuentas de ahorro", /cuentas? (de )?ahorros?/i],
    ["Tarjetas de crédito", /tarjetas? de cr[eé]dito/i],
    ["Préstamos personales", /pr[eé]stamos?/i],
    ["Créditos hipotecarios", /hipotecari/i],
    ["Depósitos a plazo", /dep[oó]sitos? a plazo|plazo fijo/i],
    ["Seguros", /\bseguros?\b/i],
    ["Inversiones", /fondos mutuos|inversiones/i],
    ["Banca digital", /banca (digital|por internet|m[oó]vil)/i],
    ["Créditos para empresas", /cr[eé]ditos? (para|empresariales|pyme)|capital de trabajo|leasing|factoring/i],
  ],
  Seguros: [["Seguro vehicular", /vehicular|soat/i], ["Seguro de salud", /seguros? de salud|eps/i], ["Seguro de vida", /seguros? de vida/i], ["Seguro de hogar", /hogar/i]],
  Telecomunicaciones: [["Planes móviles", /postpago|prepago|planes? m[oó]vil/i], ["Internet hogar", /internet (hogar|fibra)|fibra [oó]ptica/i], ["Televisión", /televisi[oó]n|cable/i], ["Equipos", /celulares|equipos/i]],
  "Educación y formación": [["Carreras", /carreras?/i], ["Maestrías", /maestr[ií]as?/i], ["Diplomados", /diplomados?/i], ["Cursos", /cursos?/i]],
  Automotriz: [["Autos nuevos", /autos? nuevos|0 ?km/i], ["Seminuevos", /seminuevos?/i], ["Repuestos", /repuestos/i], ["Servicio técnico", /servicio t[eé]cnico|taller/i], ["Financiamiento", /financiamiento/i]],
};

/**
 * Lo que vende la empresa, sin IA:
 * 1) etiquetas del menú que nombran productos del rubro; 2) si hay pocas, productos típicos
 * del rubro que aparecen en el texto de la web; 3) si no, las etiquetas filtradas.
 * `approx` indica que la lista es poco fiable.
 */
export function productsFrom(labels: string[], sector: string, text = ""): { items: string[]; approx: boolean } {
  const clean = [...new Set(labels.map((l) => l.trim()))].filter((l) => !NOT_PRODUCT.test(l));
  const vocab = PRODUCT_VOCAB[sector];
  const matched = vocab ? clean.filter((l) => vocab.test(l)) : [];
  if (matched.length >= 3) return { items: matched.slice(0, 6), approx: false };
  const fromText = (CANONICAL[sector] ?? []).filter(([, re]) => re.test(text)).map(([name]) => name);
  const combined = [...new Set([...matched, ...fromText])];
  if (combined.length >= 2) return { items: combined.slice(0, 6), approx: false };
  return { items: (combined.length ? combined : clean).slice(0, 6), approx: true };
}
