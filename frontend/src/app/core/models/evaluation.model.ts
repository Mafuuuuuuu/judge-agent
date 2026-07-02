// Evaluation models
export interface Evaluation {
  id: string;
  log_id: string;
  technical_score: number;
  completeness_score: number;
  business_score: number;
  consistency_score: number;
  prompt_compliance_score: number | null;
  helpfulness_score: number;
  tone_score: number;
  hallucination_score: number;
  efficiency_score: number;
  source_reliability_score: number;
  overall_score: number;
  feedback: string;
  issues: string;
  created_at: string;
}

// Risposta paginata di GET /api/evaluations/analytics/list
export interface EvaluationListResponse {
  page: number;
  size: number;
  total: number;
  items: Evaluation[];
}

// I campi aggregati sono nullable: con zero valutazioni SQLite AVG/MIN/MAX restituiscono NULL
export interface EvaluationMediaScore {
  totale_valutazioni: number;
  score_medi: {
    overall: number | null;
    technical: number | null;
    completeness: number | null;
    business: number | null;
    consistency: number | null;
    prompt_compliance: number | null;
    helpfulness: number | null;
    tone: number | null;
    hallucination: number | null;
    efficiency: number | null;
    source_reliability: number | null;
  };
  overall_range: { min: number | null; max: number | null };
}

export const SCORE_LABELS: Record<string, string> = {
  technical: 'Tecnico',
  completeness: 'Completezza',
  business: 'Business',
  consistency: 'Consistenza',
  prompt_compliance: 'Prompt Compliance',
  helpfulness: 'Utilità',
  tone: 'Tono',
  hallucination: 'Allucinazioni',
  efficiency: 'Efficienza',
  source_reliability: 'Affidabilità Fonti',
};
