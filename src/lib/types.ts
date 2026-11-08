export type SessionType = "real" | "roleplay";
export type CallType = "cold_call" | "cualificacion" | "videollamada";
export type Outcome = "ganada" | "en_avance" | "perdida" | "seguimiento";
export type Quality = "bien" | "regular" | "mal";
export type ProspectTemp = "caliente" | "tibio" | "frio";
export type RubricKey = "apertura" | "diagnostico" | "objeciones" | "cierre";
export type Role = "admin" | "manager" | "comercial";

export interface Rep {
  id: string;
  name: string;
  initials: string;
  role: Role;
  email: string;
  active: boolean;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  company: string;
  sector: string;
  tags: string[];
  segment: "B2B" | "B2C";
  description: string;
  personality: string;
  objections: string[];
  createdBy: string;
  /** Foto opcional (data URL). Si no hay, se dibuja una cara ilustrada a partir del nombre. */
  photo?: string;
}

export interface TranscriptLine {
  t: number; // segundos
  speaker: "rep" | "prospect";
  text: string;
}

export interface ScriptBranch {
  ifAnswer: string;
  reply: string;
}

export interface ObjectionScript {
  quote: string;
  keyQuestion: string;
  branches: ScriptBranch[];
  close: string;
}

export interface ObjectionInstance {
  category: string;
  detectedVia: string;
  quote: string;
  quality: Quality;
  script: ObjectionScript;
}

export interface SkillResult {
  skill: string;
  result: Quality | "no_aplica";
}

export interface KeyMoment {
  kind: "fuerte" | "debil";
  level: "Alta" | "Media" | "Baja";
  skill: string;
  title: string;
  repQuote: string;
  prospectQuote?: string;
  explanation: string;
  suggestion: string;
  t: number;
}

export interface Analysis {
  context: string;
  strengths: string;
  clientResponse: string;
  overall: string;
  globalFeedback: string;
  priority: string;
  prioritySkill: string;
  developmentAreas: { skill: string; quote: string; impact: string }[];
  missedOpportunities: string[];
  outcomeReasoning: string;
  nextStep: string;
  closeObjective: string;
  mainFailure: string;
  levers: string[];
  summary: string;
  tone?: { talkRatio: number; pauses: number; energy: number; warmth: number; control: number };
}

export interface Session {
  id: string;
  type: SessionType;
  callType: CallType;
  repId: string | null;
  prospectName: string;
  personaId?: string;
  date: Date;
  durationMin: number;
  status: "analizada" | "sin_analisis" | "procesando";
  score: number;
  subScores: Record<RubricKey, number>; // sobre 25
  outcome: Outcome;
  outcomeSource: "ia" | "manual";
  prospectQuality: ProspectTemp;
  objections: ObjectionInstance[];
  skills: SkillResult[];
  moments: KeyMoment[];
  analysis: Analysis | null;
  transcript: TranscriptLine[];
  versions: number;
  hasAudio: boolean;
  audioUrl?: string;
}

export interface RubricCategory {
  key: RubricKey;
  name: string;
  description: string;
  weight: number;
}

export type Rubrics = Record<CallType, RubricCategory[]>;

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  sessionId?: string;
  date: Date;
  archived: boolean;
}

export interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  connected: boolean;
}
