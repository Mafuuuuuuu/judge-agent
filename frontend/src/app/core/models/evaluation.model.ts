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

export interface EvaluationMediaScore {
  totale_valutazioni: number;
  score_medi: {
    overall: number;
    technical: number;
    completeness: number;
    business: number;
    consistency: number;
    prompt_compliance: number | null;
    helpfulness: number;
    tone: number;
    hallucination: number;
    efficiency: number;
    source_reliability: number;
  };
  overall_range: { min: number; max: number };
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
