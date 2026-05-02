// Scale-H US-EI-006: Executive Insights Supabase Client
// 01 de mayo de 2026

import { supabase } from './supabase';

export interface BenchmarkMetric {
  metric: string;
  benchmark_value: number;
  benchmark_source: string;
  top_quartile?: number;
  bottom_quartile?: number;
  unit: string;
  current_value?: number;
  gap_percent?: number;
  position?: 'above' | 'below' | 'inline';
}

export interface ExecutiveInsight {
  id: string;
  client_id: string;
  file_name: string;
  file_type: 'audio' | 'pdf' | 'excel' | 'csv' | 'word' | 'image' | 'whatsapp';
  file_size_bytes?: number;
  extracted_text?: string;
  analysis: string;
  executive_brief?: string;
  benchmarks?: { metrics: BenchmarkMetric[] }; // US-EI-009: Benchmarks JSONB
  whatsapp_participants?: string[];
  whatsapp_message_count?: number;
  sources?: string[];
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CreateExecutiveInsightParams {
  client_id: string;
  file_name: string;
  file_type: ExecutiveInsight['file_type'];
  file_size_bytes?: number;
  extracted_text?: string;
  analysis: string;
  executive_brief?: string;
  benchmarks?: { metrics: BenchmarkMetric[] }; // US-EI-009
  whatsapp_participants?: string[];
  whatsapp_message_count?: number;
  sources?: string[];
  uploaded_by?: string;
}

/**
 * Guardar un nuevo análisis ejecutivo en Supabase
 */
export async function saveExecutiveInsight(params: CreateExecutiveInsightParams): Promise<ExecutiveInsight | null> {
  try {
    const { data, error } = await supabase
      .from('executive_insights')
      .insert([params])
      .select()
      .single();

    if (error) {
      console.error('[ExecutiveInsights] Error saving:', error);
      return null;
    }

    return data as ExecutiveInsight;
  } catch (err) {
    console.error('[ExecutiveInsights] Exception saving:', err);
    return null;
  }
}

/**
 * Obtener todos los análisis ejecutivos de un cliente (no eliminados)
 */
export async function getExecutiveInsights(clientId: string): Promise<ExecutiveInsight[]> {
  try {
    const { data, error } = await supabase
      .from('executive_insights')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ExecutiveInsights] Error fetching:', error);
      return [];
    }

    return (data as ExecutiveInsight[]) || [];
  } catch (err) {
    console.error('[ExecutiveInsights] Exception fetching:', err);
    return [];
  }
}

/**
 * Soft-delete: marcar un análisis como eliminado
 */
export async function deleteExecutiveInsight(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('executive_insights')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[ExecutiveInsights] Error deleting:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[ExecutiveInsights] Exception deleting:', err);
    return false;
  }
}

/**
 * Obtener un análisis ejecutivo por ID
 */
export async function getExecutiveInsight(id: string): Promise<ExecutiveInsight | null> {
  try {
    const { data, error } = await supabase
      .from('executive_insights')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('[ExecutiveInsights] Error fetching single:', error);
      return null;
    }

    return data as ExecutiveInsight;
  } catch (err) {
    console.error('[ExecutiveInsights] Exception fetching single:', err);
    return null;
  }
}
