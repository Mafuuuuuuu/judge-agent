// Chatlog models
export interface ChatlogSummary {
  totale_chat_logs: number;
  media_messaggi: { media: number; minimo: number; massimo: number; totale_messaggi: number };
  distribuzione_assistant: DistribuzioneAssistant[];
  trend_giornaliero: TrendPoint[];
  top_chat: ChatlogTop[];
  evaluations: EvaluationStats;
}

export interface DistribuzioneAssistant {
  assistant_id: string;
  totale_chat: number;
  media_messaggi: number;
  totale_messaggi: number;
}

export interface TrendPoint {
  periodo: string;
  totale_chat: number;
  media_messaggi: number;
}

export interface ChatlogTop {
  id: string;
  assistant_id: string;
  chat_id: string;
  message_count: number;
  created_at: string;
}

export interface EvaluationStats {
  totale_valutate: number;
  percentuale_valutate: number;
  score_medi: any;
}

export interface ChatlogRecord {
  id: string;
  assistant_id: string;
  chat_id: string;
  message_count: number;
  messages_json: string;
  created_at: string;
}

// Risposta paginata di GET /api/chatlogs/analytics/list
export interface ChatlogListResponse {
  page: number;
  size: number;
  total: number;
  items: ChatlogRecord[];
}

export interface ChatlogInsertRequest {
  assistant_id: string;
  chat_id: string;
}

export interface ChatlogEvaluateRequest {
  chat_id: string;
  system_prompt_agente?: string;
}
