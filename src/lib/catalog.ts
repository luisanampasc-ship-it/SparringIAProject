import type { CallType, Integration, Persona, Rep, Rubrics } from "./types";

export const CALL_TYPES: { id: CallType; label: string; short: string }[] = [
  { id: "cold_call", label: "Llamada en frío", short: "Cold call" },
  { id: "cualificacion", label: "Cualificación", short: "Cualificación" },
  { id: "videollamada", label: "Videollamada", short: "Videollamada" },
];

export const callTypeLabel = (c: CallType) => CALL_TYPES.find((x) => x.id === c)!.short;

export const callTypeColor: Record<CallType, string> = {
  cold_call: "text-bad",
  cualificacion: "text-primary-text",
  videollamada: "text-info",
};

export const callTypeDot: Record<CallType, string> = {
  cold_call: "bg-faint",
  cualificacion: "bg-primary",
  videollamada: "bg-info",
};

export const OUTCOMES = [
  { id: "ganada", label: "Ganada", dot: "bg-good", badge: "bg-good-soft text-good" },
  { id: "en_avance", label: "En avance", dot: "bg-info", badge: "bg-info-soft text-info" },
  { id: "perdida", label: "Perdida", dot: "bg-bad", badge: "bg-bad-soft text-bad" },
  { id: "seguimiento", label: "Seguimiento", dot: "bg-warn", badge: "bg-warn-soft text-warn" },
] as const;

export const REPS: Rep[] = [
  { id: "r1", name: "Andrea Ríos", initials: "AR", role: "admin", email: "andrea@sparring.demo", active: true },
  { id: "r2", name: "Óscar Salinas", initials: "OS", role: "comercial", email: "oscar@sparring.demo", active: true },
];

export const CURRENT_USER = REPS[0];

/** Minutos de simulador al mes que puede usar cada colaborador (editable en Equipo). */
export const DEFAULT_MINUTE_LIMITS: Record<string, number> = { r1: 300, r2: 180 };

export const OBJECTION_CATEGORIES = [
  "Dinero / Capacidad de inversión",
  "Tiempo / No es el momento",
  "Confianza / Credibilidad",
  "Autoridad / Decisión compartida",
  "Necesidad / No ve el problema",
  "Logística / Operativa",
  "Indecisión / Me lo tengo que pensar",
];

export interface SkillDef {
  name: string;
  description: string;
  appliesTo: CallType[];
}

export const SKILLS: SkillDef[] = [
  { name: "Conexión inicial", description: "Los primeros segundos: presentarse, confirmar con quién se habla, explicar el motivo y generar un vínculo humano antes de entrar en materia.", appliesTo: ["cold_call", "cualificacion", "videollamada"] },
  { name: "Marco de la llamada", description: "Acordar al inicio la agenda, la duración y el objetivo de la conversación para que el prospecto sepa qué esperar.", appliesTo: ["cualificacion", "videollamada"] },
  { name: "Cualificación de necesidades", description: "Entender la situación actual, el objetivo y qué impide alcanzarlo antes de presentar la solución.", appliesTo: ["cold_call", "cualificacion", "videollamada"] },
  { name: "Detección del dolor", description: "Identificar el problema concreto que le cuesta dinero, tiempo o tranquilidad al prospecto.", appliesTo: ["cold_call", "cualificacion", "videollamada"] },
  { name: "Cuantificación del dolor", description: "Traducir el problema a cifras (horas, euros, clientes perdidos) para que el coste de no actuar sea evidente.", appliesTo: ["cualificacion", "videollamada"] },
  { name: "Cualificación de dinero", description: "Explorar presupuesto y capacidad de inversión antes del pitch para anclar el precio en el valor.", appliesTo: ["cualificacion", "videollamada"] },
  { name: "Sondeo profundo", description: "Hacer preguntas de segundo y tercer nivel (por qué, por qué ahora, qué pasa si no) en lugar de quedarse en la superficie.", appliesTo: ["cualificacion", "videollamada"] },
  { name: "Chequeo de interés", description: "Pedir al prospecto que valore del 1 al 10 su interés y explorar qué falta para subir esa nota.", appliesTo: ["cualificacion", "videollamada"] },
  { name: "Pitch estructurado", description: "Presentar la solución conectando cada beneficio con un dolor detectado, sin monólogos genéricos.", appliesTo: ["cualificacion", "videollamada"] },
  { name: "Claridad en la propuesta de valor", description: "Explicar en pocas frases qué recibe el cliente y por qué le importa.", appliesTo: ["cold_call", "cualificacion", "videollamada"] },
  { name: "Silencio post-precio", description: "Decir el precio con seguridad y callar, dejando que el prospecto reaccione primero.", appliesTo: ["videollamada"] },
  { name: "Fraccionamiento del precio", description: "Ofrecer opciones de pago que reduzcan la fricción sin rebajar el valor percibido.", appliesTo: ["videollamada"] },
  { name: "Reencuadre", description: "Cambiar la perspectiva de una objeción para que el prospecto la vea como una razón para avanzar.", appliesTo: ["cold_call", "cualificacion", "videollamada"] },
  { name: "Negociación colaborativa", description: "Buscar un acuerdo en el que ambas partes ganen, en lugar de ceder o presionar.", appliesTo: ["videollamada"] },
  { name: "Gancho de apertura", description: "Una frase inicial relevante que capte la atención en menos de diez segundos.", appliesTo: ["cold_call"] },
  { name: "Cierre con compromiso", description: "Terminar con un siguiente paso concreto: venta, reunión agendada o acción con fecha.", appliesTo: ["cold_call", "cualificacion", "videollamada"] },
];

export const skillDescription = (name: string) => SKILLS.find((s) => s.name === name)?.description ?? "";

export const DEFAULT_RUBRICS: Rubrics = {
  cold_call: [
    { key: "apertura", name: "Apertura", description: "Saludo y gancho inicial. Captar la atención en los primeros diez segundos.", weight: 40 },
    { key: "diagnostico", name: "Presentación", description: "Explicar la propuesta de valor en pocas frases y conectarla con el problema del prospecto.", weight: 25 },
    { key: "objeciones", name: "Manejo de objeciones", description: "Responder a dudas, rechazo inicial y objeciones de precio o tiempo.", weight: 25 },
    { key: "cierre", name: "Cierre y siguientes pasos", description: "Terminar con un compromiso claro: venta, reunión o próximo paso.", weight: 10 },
  ],
  cualificacion: [
    { key: "apertura", name: "Apertura", description: "Saludo, contexto de por qué dejó sus datos y marco de la llamada.", weight: 15 },
    { key: "diagnostico", name: "Diagnóstico", description: "Descubrir situación actual, dolores, quién decide y urgencia.", weight: 35 },
    { key: "objeciones", name: "Manejo de objeciones", description: "Responder a dudas, objeciones de precio y resistencia del prospecto.", weight: 25 },
    { key: "cierre", name: "Cierre y siguientes pasos", description: "Agendar la videollamada de cierre con fecha y asistentes confirmados.", weight: 25 },
  ],
  videollamada: [
    { key: "apertura", name: "Apertura", description: "Romper el hielo y acordar la agenda de la reunión.", weight: 10 },
    { key: "diagnostico", name: "Diagnóstico", description: "Profundizar en dolores, situación actual, decisor y urgencia antes del pitch.", weight: 30 },
    { key: "objeciones", name: "Manejo de objeciones", description: "Aislar la objeción real y responder con argumentos y pruebas.", weight: 25 },
    { key: "cierre", name: "Cierre y siguientes pasos", description: "Pedir la venta en la misma llamada o acordar un compromiso firme.", weight: 35 },
  ],
};

export const RUBRIC_COLORS: Record<string, string> = {
  apertura: "var(--accent)",
  diagnostico: "var(--brand)",
  objeciones: "var(--info)",
  cierre: "var(--warn)",
};

export const PERSONAS: Persona[] = [
  { id: "p1", name: "Marta Quiroga", role: "Socia directora", company: "Quiroga Asesores", sector: "Legal y fiscal", tags: ["Legal", "Fiscal", "Consultoría"], segment: "B2B", description: "Dirige un despacho de ocho personas. Está saturada por la temporada de impuestos y no tiene tiempo para atender propuestas nuevas, aunque sabe que pierde clientes por falta de seguimiento.", personality: "Directa, impaciente, valora que vayas al grano.", objections: ["No tengo tiempo ahora", "Ya probamos algo parecido"], createdBy: "r1" },
  { id: "p2", name: "Lucía Ferrer", role: "Autónoma / Dueña de estudio", company: "Estudio Ferrer", sector: "Diseño de interiores", tags: ["Servicios", "Autónomos"], segment: "B2C", description: "Lleva cuatro años como autónoma y paga varias herramientas que apenas usa. Quiere crecer pero desconfía de las promesas rápidas.", personality: "Amable pero escéptica; pide pruebas.", objections: ["¿Y esto funciona de verdad?", "Es caro para mí"], createdBy: "r1" },
  { id: "p3", name: "Beatriz Navas", role: "Recién graduada", company: "—", sector: "Formación", tags: ["Formación"], segment: "B2C", description: "Joven ambiciosa que quiere aprender ventas para cambiar de carrera. Tiene ahorros limitados y necesita la aprobación de sus padres para invertir.", personality: "Entusiasta, insegura con el dinero.", objections: ["Lo tengo que hablar con mis padres", "No sé si podré pagarlo"], createdBy: "r2" },
  { id: "p4", name: "Javier Montes", role: "Director comercial", company: "Logística Ibérica", sector: "Logística", tags: ["Logística", "Industria"], segment: "B2B", description: "Gestiona un equipo de doce comerciales con rotación alta. Busca reducir el tiempo de rampa de los nuevos.", personality: "Analítico; quiere datos y casos.", objections: ["Necesito verlo con dirección", "¿Qué ROI tiene?"], createdBy: "r1" },
  { id: "p5", name: "Carmen Vidal", role: "Gerente", company: "Clínica Dental Sonríe", sector: "Salud", tags: ["Salud", "Pymes"], segment: "B2B", description: "Gerente de una clínica con tres sedes. Le preocupa la tasa de conversión de primeras visitas a tratamientos.", personality: "Ocupada, práctica, poco técnica.", objections: ["No es el momento", "Mi equipo no lo va a usar"], createdBy: "r2" },
  { id: "p6", name: "Raúl Ortega", role: "Fundador", company: "FitBox Studio", sector: "Fitness", tags: ["Fitness", "B2C"], segment: "B2B", description: "Fundador de un gimnasio boutique que quiere vender más membresías anuales sin bajar precios.", personality: "Carismático, se dispersa con facilidad.", objections: ["Ya tengo agencia de marketing", "Déjame pensarlo"], createdBy: "r1" },
  { id: "p7", name: "Elena Castro", role: "Head of Sales", company: "Nubia Software", sector: "SaaS", tags: ["SaaS", "Tecnología"], segment: "B2B", description: "Responsable de ventas de una startup SaaS en crecimiento. Tiene presupuesto pero mucha competencia por su atención.", personality: "Exigente, conoce todas las técnicas.", objections: ["Ya usamos otra herramienta", "Mándame info por email"], createdBy: "r1" },
  { id: "p8", name: "Tomás Herrera", role: "Propietario", company: "Inmobiliaria Herrera", sector: "Inmobiliario", tags: ["Inmobiliario"], segment: "B2B", description: "Inmobiliaria familiar con cinco agentes. Quiere profesionalizar las llamadas de captación.", personality: "Tradicional, desconfía de la tecnología.", objections: ["Siempre lo hemos hecho así", "Es mucho dinero"], createdBy: "r2" },
];

export const INTEGRATIONS: Integration[] = [
  { id: "zoom", name: "Zoom", category: "Videollamadas", description: "Importa automáticamente las grabaciones de tus reuniones.", connected: true },
  { id: "meet", name: "Google Meet", category: "Videollamadas", description: "Sincroniza grabaciones desde Google Drive.", connected: false },
  { id: "teams", name: "Microsoft Teams", category: "Videollamadas", description: "Analiza las reuniones grabadas en Teams.", connected: false },
  { id: "fathom", name: "Fathom", category: "Notetakers", description: "Recibe transcripciones al terminar cada reunión.", connected: false },
  { id: "fireflies", name: "Fireflies", category: "Notetakers", description: "Importa transcripciones vía webhook.", connected: false },
  { id: "aircall", name: "Aircall", category: "Telefonía", description: "Analiza llamadas telefónicas salientes y entrantes.", connected: false },
  { id: "hubspot", name: "HubSpot", category: "CRM", description: "Vincula sesiones con deals y actualiza el resultado.", connected: false },
  { id: "pipedrive", name: "Pipedrive", category: "CRM", description: "Sincroniza resultados y notas con tus oportunidades.", connected: false },
  { id: "calendly", name: "Calendly", category: "Agenda", description: "Asocia reuniones agendadas con el prospecto.", connected: true },
  { id: "slack", name: "Slack", category: "Notificaciones", description: "Recibe alertas cuando un análisis esté listo.", connected: false },
  { id: "webhook", name: "Webhook / API", category: "Desarrolladores", description: "Envía audios o transcripciones desde cualquier sistema.", connected: false },
];
