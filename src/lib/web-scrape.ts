/**
 * Lectura de la web pública de una empresa (solo en el servidor).
 * Descarga la portada y algunas páginas internas relevantes ("Nosotros", "Servicios", "Equipo"…)
 * y extrae el texto útil para generar un prospecto.
 */

const MAX_BYTES = 1_500_000;
const MAX_CHARS_PER_PAGE = 6000;
const TIMEOUT_MS = 8000;
const INTERNAL_PAGES = 4;
const INTERESTING = /(nosotros|quienes|qui[eé]nes|about|equipo|team|empresa|company|servicios|services|productos|products|soluciones|solutions|historia|liderazgo|leadership|directorio)/i;

export interface ScrapedPage {
  url: string;
  title: string;
  description: string;
  headings: string[];
  text: string;
  /** Productos o servicios concretos encontrados en esta página (datos estructurados, fichas, títulos de la sección). */
  offerings: Offering[];
}

export interface Offering {
  name: string;
  price?: string;
  source: "datos" | "ficha" | "seccion";
}

export interface ScrapedSite {
  host: string;
  siteName: string;
  pages: ScrapedPage[];
  team: { name: string; role: string }[];
  /** Textos cortos de los menús y enlaces de la portada (suelen nombrar productos y servicios). */
  navLabels: string[];
  /** Productos y servicios concretos de la empresa, de más a menos fiable. */
  offerings: Offering[];
}

export class ScrapeError extends Error {}

/** Solo URLs públicas http(s): se rechazan IPs, localhost y nombres internos (protección SSRF básica). */
export function assertPublicUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    throw new ScrapeError("La URL no es válida.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new ScrapeError("Solo se admiten direcciones http o https.");
  const host = u.hostname.toLowerCase();
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[");
  if (isIp || host === "localhost" || !host.includes(".") || /\.(local|internal|localhost|lan|home|corp)$/.test(host)) {
    throw new ScrapeError("Introduce la dirección pública de la web (por ejemplo, https://www.empresa.com).");
  }
  if (u.port && u.port !== "80" && u.port !== "443") throw new ScrapeError("La URL no puede usar un puerto especial.");
  return u;
}

async function fetchHtml(start: URL): Promise<{ url: URL; html: string }> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0 (compatible; SparringIA/1.0; +perfil-de-prospecto)", accept: "text/html,application/xhtml+xml" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = assertPublicUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok) throw new ScrapeError(`La web respondió con el código ${res.status}.`);
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) throw new ScrapeError("La dirección no es una página web.");
    const reader = res.body?.getReader();
    if (!reader) return { url, html: await res.text() };
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
    return { url, html: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  throw new ScrapeError("La web redirige demasiadas veces.");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", uuml: "ü" };

function decode(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? m);
}

function clean(s: string) {
  return decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function meta(html: string, name: string) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, "i");
  const m = html.match(re);
  return m ? decode(m[1] ?? m[2] ?? "").trim() : "";
}

export function parsePage(url: string, html: string): ScrapedPage {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  const title = clean(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const headings = [...body.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => clean(m[1])).filter((h) => h.length > 2 && h.length < 140);
  const text = clean(body.replace(/<\/(p|li|h\d|div|section|br)>/gi, ". ")).slice(0, MAX_CHARS_PER_PAGE);
  let base: URL | null = null;
  try {
    base = new URL(url);
  } catch {
    /* sin URL base no se leen las fichas */
  }
  const offerings = [
    ...structuredOfferings(html),
    ...(base ? itemLinkOfferings(base, body) : []),
    ...cardTitleOfferings(body),
    ...(OFFER_PAGE.test(url) ? sectionHeadingOfferings(body) : []),
  ];
  return { url, title, description: meta(html, "description") || meta(html, "og:description"), headings: [...new Set(headings)].slice(0, 25), text, offerings };
}

/* ---------- Productos y servicios concretos ---------- */

/** Secciones de la web donde suelen listarse los productos o servicios. */
const OFFER_SECTION = "servicios?|services?|productos?|products?|producto|product|tratamientos?|treatments?|cursos?|courses?|programas?|planes|plans|soluciones|solutions|especialidades|shop|tienda|store|cat[aá]logo|catalog|carta|menu|men[uú]|paquetes|packages|seguros|creditos|cr[eé]ditos|cuentas|tarjetas|prestamos|pr[eé]stamos|colecciones|collections";
const OFFER_PAGE = new RegExp(`/(${OFFER_SECTION})(/|$|\\.|-)`, "i");
/** Enlace a una ficha concreta: /servicios/limpieza-dental, /producto/lentes-x… */
const ITEM_PATH = new RegExp(`/(${OFFER_SECTION})/([^/?#]+)/?$`, "i");

const SOCIAL = /^(facebook|instagram|tiktok|tik tok|youtube|linkedin|whatsapp|twitter|x|pinterest|telegram|threads|spotify|google maps|waze|messenger|email|e-mail|correo)$/i;
const CTA = /^(reserva|reservar|agenda|agendar|comprar|compra (ahora|aqu[ií]|ya|online)|cotiza|cotizar|solicita|solicitar|pide (ahora|aqu[ií]|ya|tu)|pedir|llama|llamar|escr[ií]benos|cont[aá]ctanos|cont[aá]ctenos|suscr[ií]bete|reg[ií]strate|ver|leer|saber|conoce|descubre|explora|mira|haz clic|click|clic|ir a|volver|ingresa|accede|empieza|comienza|prueba (gratis|ahora|ya)|obt[eé]n|consigue|aprovecha|a[nñ]adir|agregar|add to|buy now|shop now|book now|order now|get started|see|view|read|learn|discover|explore)\b/i;
const GENERIC_TITLE = /^(nuestros |nuestras |todos los |todas las |otros |otras |m[aá]s |los |las )?(servicios?|productos?|soluciones|tienda|cat[aá]logo|categor[ií]as?|art[ií]culos?|blog|noticias|novedades|ofertas|promociones?|destacados?|lo m[aá]s vendido|m[aá]s vendidos|nuevos?|novedad|colecci[oó]n(es)?|marcas|planes|precios|tarifas|especialidades|tratamientos|cursos|programas|men[uú]|carta|galer[ií]a|testimonios|opiniones|rese[nñ]as|clientes|equipo|nosotros|contacto|ubicaci[oó]n|sedes|horarios|preguntas frecuentes|faq|inicio|home|shop|services|products|solutions|featured|new arrivals|best sellers|sale)$/i;

/** ¿Parece el nombre de un producto o servicio (y no un botón, una red social o un título de sección)? */
export function isOfferingName(raw: string) {
  const t = raw.replace(/\s+/g, " ").replace(/[»›→>]+$/, "").trim();
  const words = t.split(" ").length;
  if (t.length < 3 || t.length > 70 || words > 8) return false;
  if (/[?¿!¡@©|•]|https?:|www\.|\d{6,}|^\d+$/.test(t)) return false;
  if (SOCIAL.test(t) || CTA.test(t) || GENERIC_TITLE.test(t) || GENERIC_LINK.test(t)) return false;
  if (/^(s\/|\$|usd|pen|€)\s?\d/i.test(t)) return false;
  return /\p{L}{3,}/u.test(t);
}

function priceOf(offers: unknown): string | undefined {
  const o = (Array.isArray(offers) ? offers[0] : offers) as Record<string, unknown> | undefined;
  if (!o || typeof o !== "object") return undefined;
  const value = o.price ?? o.lowPrice;
  if (value === undefined || value === null || value === "") return undefined;
  const currency = String(o.priceCurrency ?? "");
  const symbol = currency === "PEN" ? "S/ " : currency === "USD" ? "US$ " : currency === "EUR" ? "€ " : currency ? `${currency} ` : "";
  return `${symbol}${value}`;
}

const LD_TYPES = /^(Product|ProductGroup|ProductModel|IndividualProduct|Service|FinancialProduct|BankAccount|LoanOrCredit|InvestmentOrDeposit|PaymentCard|CreditCard|InsuranceAgency|MenuItem|Course|SoftwareApplication|Event|Trip|TouristTrip|HotelRoom|Vehicle|Car|MedicalProcedure|MedicalTherapy|Offer)$/;

/** Datos estructurados (JSON-LD) que muchas webs publican para Google: Product, Service, OfferCatalog… */
function structuredOfferings(html: string): Offering[] {
  const out: Offering[] = [];
  const walk = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 8 || out.length > 40) return;
    if (Array.isArray(node)) return node.forEach((n) => walk(n, depth + 1));
    const o = node as Record<string, unknown>;
    const types = ([] as unknown[]).concat(o["@type"] ?? []).map(String);
    const item = types.includes("Offer") && o.itemOffered && typeof o.itemOffered === "object" ? (o.itemOffered as Record<string, unknown>) : o;
    if (types.some((t) => LD_TYPES.test(t)) && typeof item.name === "string") {
      const name = clean(item.name);
      if (isOfferingName(name)) out.push({ name, price: priceOf(o.offers ?? (types.includes("Offer") ? o : undefined)), source: "datos" });
    }
    for (const [k, v] of Object.entries(o)) if (k !== "offers" && typeof v === "object") walk(v, depth + 1);
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      walk(JSON.parse(m[1].trim()), 0);
    } catch {
      /* JSON-LD mal formado */
    }
  }
  return out;
}

function humanizeSlug(slug: string) {
  const t = decodeURIComponent(slug).replace(/\.(html?|php|aspx?)$/i, "").replace(/[-_+]+/g, " ").replace(/\b\d{3,}\b/g, "").replace(/\s+/g, " ").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : "";
}

/** Enlaces a fichas concretas dentro de las secciones de productos o servicios. */
function itemLinkOfferings(base: URL, html: string): Offering[] {
  const out: Offering[] = [];
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u: URL;
    try {
      u = new URL(m[1], base);
    } catch {
      continue;
    }
    if (u.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
    const slug = u.pathname.match(ITEM_PATH)?.[2];
    if (!slug || /^(page|pagina|categoria|category|tag|etiqueta|todos|all|index)$/i.test(slug) || /^\d+$/.test(slug)) continue;
    const label = clean(m[2]);
    const name = isOfferingName(label) ? label : humanizeSlug(slug);
    if (isOfferingName(name)) out.push({ name, source: "ficha" });
  }
  return out;
}

/** Títulos de tarjetas de producto típicos de tiendas (WooCommerce, Shopify, VTEX…). */
function cardTitleOfferings(html: string): Offering[] {
  const re = /<(h[2-6]|a|div|span|p)[^>]+class=["'][^"']*(product[-_]?(?:title|name)|woocommerce-loop-product__title|service[-_]?(?:title|name)|card__heading|vtex-product-summary[^"']*brandName)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  return [...html.matchAll(re)].map((m) => clean(m[3])).filter(isOfferingName).map((name) => ({ name, source: "seccion" as const }));
}

/** En la página de Servicios o Productos, sus subtítulos suelen ser los servicios concretos. */
function sectionHeadingOfferings(html: string): Offering[] {
  return [...html.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)]
    .map((m) => clean(m[1]))
    .filter((h) => h.split(" ").length <= 6 && isOfferingName(h) && !/^(por qu[eé]|c[oó]mo|qu[eé]|nuestr|somos|bienvenid|cont[aá]ct|s[ií]guenos|horario|d[oó]nde|tu |te |vive|descubre)/i.test(h))
    .map((name) => ({ name, source: "seccion" as const }));
}

const SOURCE_RANK: Record<Offering["source"], number> = { datos: 0, ficha: 1, seccion: 2 };

/** Une los productos de todas las páginas: sin duplicados y primero los más fiables. */
export function mergeOfferings(pages: ScrapedPage[], max = 12): Offering[] {
  const byKey = new Map<string, Offering>();
  for (const o of pages.flatMap((p) => p.offerings)) {
    const key = o.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    const prev = byKey.get(key);
    if (!prev || SOURCE_RANK[o.source] < SOURCE_RANK[prev.source] || (!prev.price && o.price)) byKey.set(key, { ...o, price: o.price ?? prev?.price });
  }
  return [...byKey.values()].sort((a, b) => SOURCE_RANK[a.source] - SOURCE_RANK[b.source]).slice(0, max);
}

function internalLinks(base: URL, html: string) {
  const out = new Map<string, number>();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const u = new URL(m[1], base);
      if (u.hostname !== base.hostname || u.pathname === base.pathname) continue;
      const label = `${u.pathname} ${clean(m[2])}`;
      if (!INTERESTING.test(label)) continue;
      u.search = "";
      const score = /(servicios|services|productos|products|soluciones|solutions|tratamientos|cursos|planes|tienda|shop)/i.test(label) ? 3 : /(nosotros|quienes|about|equipo|team|liderazgo|leadership)/i.test(label) ? 2 : 1;
      out.set(u.toString(), Math.max(out.get(u.toString()) ?? 0, score));
    } catch {
      /* enlace no válido */
    }
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]).map(([u]) => u).slice(0, INTERNAL_PAGES);
}

const ROLE = "(CEO|CFO|COO|CTO|CMO|Fundador(?:a)?|Co-?fundador(?:a)?|Gerente(?: General| Comercial| de Ventas)?|Director(?:a)?(?: General| Comercial| Ejecutiv[oa]| de Ventas)?|Presidente|Socio(?:a)? (?:Director(?:a)?|Fundador(?:a)?)|Jefe(?:a)? de (?:Ventas|Compras)|Head of Sales|Managing Director|Founder|Owner|Propietari[oa])";
const NAME = "([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+(?:de\\s+|del\\s+|la\\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})";

/** Nombres y cargos que la propia web publica (p. ej. "María López – Gerente General"). */
export function findTeam(texts: string[]) {
  const found = new Map<string, string>();
  const patterns = [new RegExp(`${NAME}\\s*[,–—|:-]\\s*${ROLE}`, "g"), new RegExp(`${ROLE}\\s*[,–—|:-]?\\s*${NAME}`, "g")];
  for (const t of texts) {
    for (const m of t.matchAll(patterns[0])) found.set(m[1], m[2]);
    for (const m of t.matchAll(patterns[1])) if (!found.has(m[2])) found.set(m[2], m[1]);
  }
  return [...found.entries()].map(([name, role]) => ({ name, role })).slice(0, 8);
}

const GENERIC_LINK = /^(inicio|home|contacto|cont[aá]ctanos|contact|blog|noticias|nosotros|qui[eé]nes somos|about|ayuda|faq|preguntas frecuentes|login|ingresar|iniciar sesi[oó]n|reg[ií]strate|mi cuenta|carrito|buscar|ver m[aá]s|leer m[aá]s|saber m[aá]s|m[aá]s informaci[oó]n|learn more|read more|aqu[ií]|click aqu[ií]|cookies|privacidad|t[eé]rminos.*|pol[ií]tica.*|libro de reclamaciones|trabaja con nosotros|prensa|mapa del sitio|es|en|english|espa[ñn]ol|men[uú]|cerrar|siguiente|anterior|view|view all|ver todo|read .*|skip to .*|ir al contenido.*|saltar .*|news|announcements?|careers|company|events|press|support|sign in|sign up|log in|get started|try .*|download|descargar|comenzar|empezar)$/i;

/** Etiquetas de menú: frases cortas, sin preguntas ni exclamaciones, ordenadas por frecuencia. */
export function navLabelsFrom(html: string) {
  const count = new Map<string, number>();
  for (const m of html.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)) {
    const t = clean(m[1]);
    const words = t.split(" ").length;
    if (t.length < 3 || t.length > 32 || words > 4 || /[?¿!¡:@©|]|\d{3,}/.test(t) || GENERIC_LINK.test(t) || SOCIAL.test(t) || CTA.test(t) || GENERIC_TITLE.test(t)) continue;
    count.set(t, (count.get(t) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 30);
}

export async function scrapeSite(rawUrl: string): Promise<ScrapedSite> {
  const start = assertPublicUrl(rawUrl);
  let home: { url: URL; html: string };
  try {
    home = await fetchHtml(start);
  } catch (e) {
    if (e instanceof ScrapeError) throw e;
    throw new ScrapeError("No se pudo acceder a la web. Revisa la dirección o inténtalo más tarde.");
  }
  const pages = [parsePage(home.url.toString(), home.html)];
  const links = internalLinks(home.url, home.html);
  const extra = await Promise.allSettled(links.map(async (l) => {
    const r = await fetchHtml(assertPublicUrl(l));
    return parsePage(r.url.toString(), r.html);
  }));
  extra.forEach((r) => r.status === "fulfilled" && pages.push(r.value));
  const host = home.url.hostname.replace(/^www\./, "");
  const parts = pages[0].title.split(/\s[|–—\\/:-]\s|\s?[|–—\\]\s?/).map((x) => x.trim()).filter((x) => x && !/^(home|inicio|bienvenid[oa]s?|welcome|p[aá]gina principal)$/i.test(x));
  const siteName = meta(home.html, "og:site_name") || parts.sort((a, b) => a.length - b.length)[0] || host;
  return { host, siteName, pages, team: findTeam(pages.map((p) => p.text)), navLabels: navLabelsFrom(home.html), offerings: mergeOfferings(pages) };
}
