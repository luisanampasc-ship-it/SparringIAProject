import type { CallType, ObjectionScript } from "./types";

/** Perfiles de cliente para adaptar el discurso (inspirados en estilos de comunicación). */
export interface ClientProfile {
  id: string;
  name: string;
  tagline: string;
  recognize: string[];
  approach: string[];
  avoid: string[];
  speech: ObjectionScript;
  personaId?: string; // prospecto del simulador con el que practicarlo
}

export const CLIENT_PROFILES: ClientProfile[] = [
  {
    id: "analitico",
    name: "Analítico",
    tagline: "Decide con datos, casos y lógica.",
    recognize: ["Pregunta por cifras, ROI y detalles del proceso", "Habla pausado y pide tiempo para revisar", "Desconfía de promesas sin pruebas"],
    approach: ["Lleva datos concretos y un caso de su sector", "Estructura la llamada y cumple la agenda", "Envía un resumen por escrito con los números"],
    avoid: ["Exagerar resultados", "Presionar para cerrar sin datos", "Respuestas vagas"],
    speech: {
      quote: "¿Qué ROI tiene esto? Necesito verlo con números.",
      keyQuestion: "Totalmente lógico. ¿Qué indicador usarías tú para decidir que la inversión ha merecido la pena: más cierres, menos tiempo de rampa o ticket medio?",
      branches: [
        { ifAnswer: "Más cierres", reply: "Un cliente de logística con doce comerciales pasó del 18% al 26% de cierre en tres meses. Con tu volumen, ¿cuánto supondrían ocho puntos más al mes?" },
        { ifAnswer: "Tiempo de rampa", reply: "Los nuevos comerciales practican con prospectos de IA desde el primer día; la rampa media baja de 90 a 50 días. ¿Cuánto te cuesta hoy cada mes de rampa?" },
      ],
      close: "Te preparo un cálculo con tus cifras y lo revisamos el jueves 20 minutos. ¿Te encaja a las 10:00?",
    },
    personaId: "p4",
  },
  {
    id: "directo",
    name: "Directo / Dominante",
    tagline: "Quiere resultados rápidos y que vayas al grano.",
    recognize: ["Interrumpe y pide ir al punto", "Toma decisiones rápidas", "Valora la eficiencia y el control"],
    approach: ["Empieza por el resultado, no por el proceso", "Frases cortas y seguras", "Ofrécele opciones para que él elija"],
    avoid: ["Rodeos y presentaciones largas", "Dudar al decir el precio", "Discutir por ganar la razón"],
    speech: {
      quote: "No tengo tiempo, dime en un minuto qué me ofreces.",
      keyQuestion: "Perfecto, voy al grano: ayudamos a equipos como el tuyo a cerrar más ventas practicando con IA. ¿Cuál es hoy tu mayor freno para cerrar más?",
      branches: [
        { ifAnswer: "El equipo no cierra", reply: "Entonces lo que te interesa es ver dónde se pierden las ventas. En 15 minutos te enseño los tres puntos donde tu equipo pierde más acuerdos." },
        { ifAnswer: "Nada, vamos bien", reply: "Genial. Si pudieras subir un 10% sin contratar a nadie, ¿te interesaría verlo, aunque sea para comparar?" },
      ],
      close: "Dos opciones: lo vemos mañana a las 9:00 o el viernes a las 12:00. ¿Cuál prefieres?",
    },
    personaId: "p1",
  },
  {
    id: "expresivo",
    name: "Expresivo / Sociable",
    tagline: "Se mueve por emociones, relaciones y visión.",
    recognize: ["Cuenta anécdotas y se dispersa", "Se entusiasma rápido", "Le importa la imagen y el reconocimiento"],
    approach: ["Conecta a nivel personal antes de entrar en materia", "Usa historias y casos visuales", "Reconduce con suavidad al objetivo"],
    avoid: ["Bombardear con datos técnicos", "Cortarle de forma brusca", "Dejar el cierre sin fecha (se olvidará)"],
    speech: {
      quote: "¡Me encanta la idea! Aunque déjame pensarlo…",
      keyQuestion: "Me alegra que te guste. Imagínate dentro de tres meses con el equipo cerrando más: ¿qué sería lo primero que cambiaría en tu negocio?",
      branches: [
        { ifAnswer: "Crecer / abrir otra sede", reply: "Eso es justo lo que consiguió Raúl con su estudio. ¿Qué te parece si arrancamos con el equipo actual y lo medimos juntos?" },
        { ifAnswer: "Duda concreta", reply: "Cuéntame, ¿qué es lo que te haría dudar? Prefiero resolverlo ahora contigo." },
      ],
      close: "Hagamos una cosa: lo dejamos agendado para empezar el lunes y, si cambias de idea, me avisas. ¿Te parece?",
    },
    personaId: "p6",
  },
  {
    id: "amable",
    name: "Amable / Estable",
    tagline: "Busca seguridad, confianza y evitar riesgos.",
    recognize: ["Es cordial pero evita comprometerse", "Necesita consultar con otros", "Le preocupa el cambio y el impacto en su equipo"],
    approach: ["Genera confianza con calma y paciencia", "Explica el proceso paso a paso", "Reduce el riesgo: garantía, prueba o empezar en pequeño"],
    avoid: ["Presionar o crear urgencia artificial", "Cambiar las condiciones a mitad de la conversación", "Ignorar a los otros decisores"],
    speech: {
      quote: "Me parece interesante, pero lo tengo que hablar con mi equipo.",
      keyQuestion: "Claro, tiene todo el sentido. ¿Qué crees que le preocuparía más a tu equipo y cómo te gustaría que lo resolviéramos?",
      branches: [
        { ifAnswer: "Que sea difícil de usar", reply: "Lo entiendo. Empezamos con una sesión guiada con tu equipo y yo me encargo de que todos sepan usarlo. ¿Eso te daría tranquilidad?" },
        { ifAnswer: "El coste", reply: "Podemos empezar con un plan pequeño para dos personas y ampliarlo cuando veáis resultados. Así no hay riesgo." },
      ],
      close: "¿Te parece si organizamos una llamada de 20 minutos con tu equipo esta semana para resolver sus dudas juntos?",
    },
    personaId: "p5",
  },
];

/** Estrategias según el tipo de llamada. */
export const CALL_STRATEGIES: { callType: CallType; title: string; goal: string; steps: { title: string; text: string; example: string }[] }[] = [
  {
    callType: "cold_call",
    title: "Llamada en frío: el método de los 30 segundos",
    goal: "Conseguir una reunión, no vender en la primera llamada.",
    steps: [
      { title: "Permiso", text: "Reconoce que interrumpes y pide 30 segundos.", example: "Hola Marta, soy Andrea de Sparring. Sé que te pillo en mitad de algo, ¿me das 30 segundos y decides si seguimos?" },
      { title: "Gancho relevante", text: "Menciona un problema típico de su sector, no tu producto.", example: "Hablo con muchos despachos que pierden clientes en temporada de impuestos por no poder hacer seguimiento." },
      { title: "Pregunta de interés", text: "Una pregunta cerrada y fácil de responder.", example: "¿Os pasa algo parecido o lo tenéis controlado?" },
      { title: "Cierre de reunión", text: "Propón un siguiente paso corto y concreto.", example: "Te propongo 15 minutos el martes para enseñarte cómo lo resuelven otros despachos. ¿Mañana o tarde?" },
    ],
  },
  {
    callType: "cualificacion",
    title: "Cualificación: diagnóstico antes que solución",
    goal: "Confirmar encaje (necesidad, urgencia, decisor y presupuesto) y agendar el cierre.",
    steps: [
      { title: "Origen", text: "Pregunta qué le llevó a dejar sus datos.", example: "¿Qué te llevó a rellenar el formulario y por qué justo ahora?" },
      { title: "Situación y dolor", text: "Entiende dónde está y qué le impide avanzar.", example: "¿Qué has intentado hasta ahora y qué ha faltado para que funcionara?" },
      { title: "Cuantificar", text: "Lleva el problema a cifras.", example: "¿Cuántas ventas calculas que se escapan al mes por esto?" },
      { title: "Decisor y presupuesto", text: "Aclara quién decide y la capacidad de inversión antes del pitch.", example: "Si te encaja, ¿lo decides tú o lo tendrías que ver con alguien más?" },
    ],
  },
  {
    callType: "videollamada",
    title: "Videollamada de cierre: presentar y cerrar en la misma llamada",
    goal: "Presentar la solución conectada al dolor y pedir el compromiso.",
    steps: [
      { title: "Recapitular", text: "Resume lo que te contó para confirmar que lo entendiste.", example: "En la última llamada me dijiste que tu equipo pierde un 30% de las oportunidades en la objeción de precio, ¿sigue siendo así?" },
      { title: "Pitch a medida", text: "Cada beneficio se conecta con un dolor detectado.", example: "Como me dijiste que el problema es el precio, te enseño cómo practican esa objeción cada día…" },
      { title: "Precio y silencio", text: "Di el precio con seguridad y calla.", example: "La inversión es de 3.990 €. (silencio)" },
      { title: "Cierre", text: "Pide la decisión con dos opciones.", example: "¿Prefieres empezar con el pago único o en tres cuotas?" },
    ],
  },
];
