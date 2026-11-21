import type { Gender, Persona } from "./types";

/*
 * Generación de prospectos en modo demo: lee la descripción con reglas sencillas
 * (género, edad, sector, objeciones) para que el perfil guarde relación con lo escrito.
 * En producción esto lo sustituye /api/personas/generate con un LLM y salida JSON validada.
 */

const NAMES: Record<Gender, string[]> = {
  femenino: ["Gabriela Soto", "Paula Herrero", "Silvia Ramos", "Valeria Núñez", "Daniela Ortiz", "Lorena Paz", "Andrea Molina", "Camila Reyes"],
  masculino: ["Manuel Ibarra", "Andrés Calvo", "Diego Salazar", "Ricardo Peña", "Jorge Castillo", "Luis Herrera", "Martín Rojas", "Sebastián Vargas"],
};

const MALE = /\b(hombre|masculin[oa]|var[oó]n|señor|caballero|chico|padre|pap[aá]|due[ñn]o|gerente general|director|empresario|ingeniero|abogado|doctor|médico)\b/i;
const FEMALE = /\b(mujer|femenin[oa]|señora|chica|dama|madre|mam[aá]|due[ñn]a|directora|empresaria|ingeniera|abogada|doctora|médica)\b/i;

export function detectGender(text: string): Gender | undefined {
  // "género masculino/femenino" tiene prioridad sobre cualquier otra pista.
  if (/g[eé]nero\s+masculino/i.test(text)) return "masculino";
  if (/g[eé]nero\s+femenino/i.test(text)) return "femenino";
  const m = MALE.test(text);
  const f = FEMALE.test(text);
  if (m && !f) return "masculino";
  if (f && !m) return "femenino";
  return undefined;
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function pickName(gender: Gender, seed: string) {
  const list = NAMES[gender];
  return list[hash(seed) % list.length];
}

const SECTORS: [RegExp, string][] = [
  [/\b(banco|bancari[oa]|cuenta de ahorros?|cuentas? de ahorro|tarjetas? de cr[eé]dito|pr[eé]stamos?|cr[eé]dito hipotecario|hipotecas?|financiera|microfinanzas|caja municipal|cooperativa de ahorro|inversiones|fondos mutuos)\b/gi, "Banca y finanzas"],
  [/\b(seguros?|p[oó]lizas?|aseguradora|siniestros?)\b/gi, "Seguros"],
  [/\b(telefon[ií]a|internet|fibra [oó]ptica|planes? m[oó]viles?|operador|telecomunicaciones|portabilidad)\b/gi, "Telecomunicaciones"],
  [/\b(carros?|coches?|autos?|autom[oó]viles?|veh[ií]culos?|concesionari[oa]|mazda|toyota|motos?)\b/gi, "Automotriz"],
  [/\b(inmobiliari[oa]|departamentos?|inmuebles?|terrenos?|proyectos? de vivienda|constructora|construcci[oó]n)\b/gi, "Inmobiliario y construcción"],
  [/\b(restaurantes?|cafeter[ií]as?|hoteles?|gastronom[ií]a|delivery de comida|men[uú] del d[ií]a)\b/gi, "Hostelería y restauración"],
  [/\b(cl[ií]nicas?|salud|dental|m[eé]dic[oa]s?|hospital|farmacias?|laboratorio cl[ií]nico)\b/gi, "Salud"],
  [/\b(software|saas|plataforma digital|desarrollo de software|nube|ciberseguridad|inteligencia artificial)\b/gi, "Tecnología"],
  [/\b(universidad|colegio|instituto|cursos?|carreras?|maestr[ií]as?|diplomados?|formaci[oó]n|educaci[oó]n)\b/gi, "Educación y formación"],
  [/\b(supermercados?|tiendas?|retail|e-?commerce|compra online|cat[aá]logo de productos)\b/gi, "Retail y comercio"],
  [/\b(log[ií]stica|transporte de carga|courier|almacenes|distribuci[oó]n)\b/gi, "Logística y transporte"],
  [/\b(energ[ií]a|electricidad|gas natural|petr[oó]leo|miner[ií]a|minera)\b/gi, "Energía y minería"],
  [/\b(consultor[ií]a|asesor[ií]a|auditor[ií]a|abogados|estudio jur[ií]dico|contadores)\b/gi, "Servicios profesionales"],
  [/\b(gimnasio|fitness|deportes?)\b/gi, "Fitness y deporte"],
];

/** Rubro con más coincidencias en el texto (no la primera palabra que aparezca). */
export function detectSector(text: string) {
  let best: [string, number] | null = null;
  for (const [re, name] of SECTORS) {
    const n = (text.match(re) ?? []).length;
    if (n > 0 && (!best || n > best[1])) best = [name, n];
  }
  return best?.[0];
}

/** B2C cuando la persona compra para sí misma (un carro, una casa, un curso…). */
function isConsumer(text: string) {
  return /\b(quiere comprar|comprar(se)? un|para s[ií] mism|para su familia|particular|personal)\b/i.test(text) || !/\b(empresa|negocio|equipo|compañ[ií]a|pyme|socio)\b/i.test(text);
}

function objectionsFrom(text: string, consumer: boolean) {
  const out: string[] = [];
  if (/\b(no tiene (el )?dinero|sin dinero|presupuesto|caro|precio|cr[eé]dito|financ)/i.test(text)) out.push(consumer ? "Ahora mismo no me alcanza el dinero" : "No tenemos presupuesto para esto ahora");
  if (/\b(tiempo|ocupad[oa]|liad[oa])\b/i.test(text)) out.push("No tengo tiempo para verlo ahora");
  if (/\b(desconf|esc[eé]ptic|duda)/i.test(text)) out.push("¿Y cómo sé que funciona de verdad?");
  if (/\b(pareja|esposa|esposo|socio|jefe|familia)\b/i.test(text)) out.push("Lo tengo que consultar antes de decidir");
  if (out.length < 2) out.push(consumer ? "Déjame pensarlo y te digo algo" : "Mándame la información por email");
  if (out.length < 2) out.push("Ya estoy mirando otras opciones");
  return out.slice(0, 3);
}

function roleFor(gender: Gender, consumer: boolean, text: string) {
  const g = (m: string, f: string) => (gender === "masculino" ? m : f);
  if (consumer) return g("Cliente particular", "Clienta particular");
  if (/\bgerente\b/i.test(text)) return "Gerente";
  if (/\bdue[ñn][oa]|propietari[oa]\b/i.test(text)) return g("Propietario", "Propietaria");
  if (/\baut[oó]nom[oa]|independiente|freelance\b/i.test(text)) return g("Autónomo", "Autónoma");
  return g("Director general", "Directora general");
}

/** Genera un prospecto a partir de una descripción libre. */
export function generateFromDescription(prompt: string, base: Persona): Persona {
  const gender = detectGender(prompt) ?? (hash(prompt) % 2 ? "masculino" : "femenino");
  const consumer = isConsumer(prompt);
  const sector = detectSector(prompt) ?? "Servicios profesionales";
  const clean = prompt.trim().replace(/\s+/g, " ");
  return {
    ...base,
    gender,
    name: pickName(gender, prompt),
    role: roleFor(gender, consumer, prompt),
    company: consumer ? "Particular" : "Empresa por definir",
    sector,
    tags: [sector, consumer ? "B2C" : "B2B"],
    segment: consumer ? "B2C" : "B2B",
    description: `${clean.charAt(0).toUpperCase()}${clean.slice(1)}${/[.!?]$/.test(clean) ? "" : "."}`,
    personality: consumer ? "Cercano pero prudente con el dinero; necesita sentir que hace una buena compra." : "Pragmático; pide números concretos antes de decidir.",
    objections: objectionsFrom(prompt, consumer),
  };
}

function hostName(url: string) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const brand = host.split(".")[0].replace(/[-_]/g, " ");
  return { host, brand: brand.replace(/\b\w/g, (c) => c.toUpperCase()) };
}

/** Opción 1: la web es la del cliente al que vas a vender → perfil del decisor de esa empresa. */
export function generateFromClientWeb(url: string, base: Persona): Persona {
  const { host, brand } = hostName(url);
  const gender: Gender = hash(host) % 2 ? "masculino" : "femenino";
  const sector = detectSector(host) ?? "Detectado desde su web";
  return {
    ...base,
    gender,
    name: pickName(gender, host),
    role: gender === "masculino" ? "Director general" : "Directora general",
    company: brand,
    sector,
    tags: [sector, "Desde web del cliente"],
    segment: "B2B",
    description: `Decisor de ${brand} (${host}). Perfil construido a partir de su web: a qué se dedican, a quién venden y qué retos suelen tener las empresas de su tamaño. Úsalo para preparar la llamada con este cliente concreto.`,
    personality: "Ocupado y directo; quiere saber rápido qué gana su empresa.",
    objections: ["Ya trabajamos con otro proveedor", "Mándame una propuesta por email"],
  };
}

/** Opción 2: la web es la de tu propio negocio → perfil del cliente ideal al que venderle. */
export function generateFromOwnWeb(url: string, base: Persona): Persona {
  const { host, brand } = hostName(url);
  const gender: Gender = hash(`${host}-icp`) % 2 ? "masculino" : "femenino";
  const sector = detectSector(host) ?? "Cliente ideal";
  return {
    ...base,
    gender,
    name: pickName(gender, `${host}-icp`),
    role: "Responsable de compras",
    company: `Cliente ideal de ${brand}`,
    sector,
    tags: [sector, "Cliente ideal"],
    segment: "B2B",
    description: `Cliente ideal para ${brand} (${host}), generado a partir de tu propia web: qué vendes, tu propuesta de valor y tus precios. Representa al tipo de comprador que más encaja con tu oferta y las dudas que suele tener antes de comprar.`,
    personality: "Interesado pero compara opciones; valora casos de éxito.",
    objections: ["¿Por qué vosotros y no la competencia?", "Es más caro de lo que esperaba", "Déjame pensarlo"],
  };
}
