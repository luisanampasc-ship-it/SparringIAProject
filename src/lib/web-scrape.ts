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
}

export interface ScrapedSite {
  host: string;
  siteName: string;
  pages: ScrapedPage[];
  team: { name: string; role: string }[];
  /** Textos cortos de los menús y enlaces de la portada (suelen nombrar productos y servicios). */
  navLabels: string[];
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
  return { url, title, description: meta(html, "description") || meta(html, "og:description"), headings: [...new Set(headings)].slice(0, 25), text };
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
      const score = /(nosotros|quienes|about|equipo|team|liderazgo|leadership)/i.test(label) ? 2 : 1;
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
    if (t.length < 3 || t.length > 32 || words > 4 || /[?¿!¡:@©|]|\d{3,}/.test(t) || GENERIC_LINK.test(t)) continue;
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
  return { host, siteName, pages, team: findTeam(pages.map((p) => p.text)), navLabels: navLabelsFrom(home.html) };
}
