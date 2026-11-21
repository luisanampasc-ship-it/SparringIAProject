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
  [/\b(carro|coche|auto(m[oó]vil)?|veh[ií]culo|mazda|toyota|moto)\b/i, "Automotriz"],
  [/\b(casa|departamento|piso|inmueble|inmobiliari[oa]|terreno)\b/i, "Inmobiliario"],
  [/\b(restaurante|cafeter[ií]a|bar|hotel|comida)\b/i, "Hostelería"],
  [/\b(cl[ií]nica|salud|dental|m[eé]dic[oa]|hospital)\b/i, "Salud"],
  [/\b(software|saas|tecnolog[ií]a|app|startup)\b/i, "Tecnología"],
  [/\b(curso|formaci[oó]n|universidad|estudiar|maestr[ií]a)\b/i, "Formación"],
  [/\b(seguro|p[oó]liza)\b/i, "Seguros"],
  [/\b(gimnasio|fitness|deporte)\b/i, "Fitness"],
  [/\b(tienda|retail|comercio|e-?commerce)\b/i, "Comercio"],
];

export function detectSector(text: string) {
  return SECTORS.find(([re]) => re.test(text))?.[1];
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
