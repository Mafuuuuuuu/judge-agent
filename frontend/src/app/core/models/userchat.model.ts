// Userchat models
export interface UserChatSummary {
  totale_conversazioni: number;
  media_messaggi: { media: number; minimo: number; massimo: number; totale_messaggi: number };
  distribuzione_system_prompt: DistribuzionePrompt[];
  trend_giornaliero: TrendPoint[];
  top_chat: UserChatTop[];
  evaluations: EvaluationStats;
}

export interface DistribuzionePrompt {
  system_prompt: string;
  totale: number;
  media_messaggi: number;
}

export interface TrendPoint {
  periodo: string;
  totale_chat: number;
  media_messaggi: number;
}

export interface UserChatTop {
  id: string;
  system_prompt: string | null;
  message_count: number;
  created_at: string;
}

export interface EvaluationStats {
  totale_valutate: number;
  percentuale_valutate: number;
  score_medi: ScoreMedi;
}

export interface ScoreMedi {
  [key: string]: number | null | undefined;
  overall: number | null;
  technical: number | null;
  completeness: number | null;
  business: number | null;
  consistency: number | null;
  helpfulness: number | null;
  tone: number | null;
  hallucination: number | null;
  efficiency: number | null;
  source_reliability: number | null;
  prompt_compliance?: number | null;
}

export interface UserChatListResponse {
  totale: number;
  limit: number;
  offset: number;
  risultati: UserChatRecord[];
}

export interface UserChatRecord {
  id: string;
  system_prompt: string | null;
  messages_json: string;
  message_count: number;
  created_at: string;
}

export interface UserChatInsertRequest {
  chat_id?: string;
  system_prompt?: string;
  messages: any[];
}
