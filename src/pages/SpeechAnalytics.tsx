// SpeechAnalytics.tsx — WeKall Intelligence V20
// Módulo de análisis de transcripciones de llamadas

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Mic, AlertTriangle, Loader2, FileText, Users, TrendingUp, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useClient } from '@/contexts/ClientContext';
import { cn } from '@/lib/utils';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface Transcription {
  id: string;
  agent_name: string;
  call_date: string;
  result: string;
  summary: string;
  transcript: string;
  campaign?: string;
  aht_segundos?: number;
}

interface WordFrequency {
  word: string;
  count: number;
}

interface AgentSentiment {
  agent: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

interface CampaignResult {
  campaign: string;
  result: string;
  count: number;
}

interface RiskPhrase {
  agent: string;
  date: string;
  phrase: string;
  context: string;
}

interface ScatterPoint {
  aht: number;
  result: number;
  agent: string;
  resultLabel: string;
}

// ─── Stopwords en español ─────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'que', 'es', 'se', 'no', 'te', 'los', 'las',
  'un', 'una', 'por', 'con', 'su', 'al', 'del', 'lo', 'le', 'me', 'si', 'pero',
  'muy', 'más', 'como', 'ya', 'su', 'ha', 'mi', 'he', 'o', 'para', 'fue', 'esta',
  'este', 'está', 'son', 'hay', 'todo', 'ser', 'han', 'sus', 'también', 'sobre',
  'entre', 'cuando', 'hasta', 'desde', 'porque', 'esto', 'tiene', 'así', 'donde',
  'bueno', 'bien', 'ok', 'sí', 'ah', 'eh', 'pues', 'entonces', 'señor', 'señora',
  'hola', 'gracias', 'favor', 'puede', 'podría', 'momento', 'le', 'les', 'nos',
  'usted', 'ustedes', 'voy', 'voy', 'vamos', 'tengo', 'tiene', 'tenemos',
]);

// ─── Palabras de sentimiento ──────────────────────────────────────────────────

const POSITIVE_WORDS = [
  'satisfecho', 'pagará', 'promesa', 'pago', 'acuerdo', 'comprometido', 'gracias',
  'positivo', 'excelente', 'bien', 'perfecto', 'claro', 'entendido', 'acepta',
  'comprende', 'colabora', 'dispuesto', 'favorable', 'solución', 'correcto',
];

const NEGATIVE_WORDS = [
  'rechazo', 'enojo', 'molesto', 'no pago', 'no puedo', 'imposible', 'nunca',
  'denunciar', 'abogado', 'queja', 'problema', 'error', 'mal', 'nunca', 'jamás',
  'robo', 'estafa', 'no conozco', 'colgó', 'cortó', 'insiste', 'acoso', 'demanda',
];

// ─── Frases de riesgo ─────────────────────────────────────────────────────────

const RISK_PHRASES = [
  'no te pago',
  'voy a denunciar',
  'habla con mi abogado',
  'no te conozco',
  'esto es un robo',
  'me van a demandar',
  'no debo nada',
  'llamen a mi abogado',
  'es una estafa',
  'acoso telefónico',
  'voy a reportar',
  'no tengo dinero',
];

// ─── Colores ──────────────────────────────────────────────────────────────────

const COLORS = ['#6334C0', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#8B5CF6', '#06B6D4'];

// ─── Funciones de análisis ────────────────────────────────────────────────────

function getWordFrequency(transcriptions: Transcription[]): WordFrequency[] {
  const freq: Record<string, number> = {};

  for (const t of transcriptions) {
    const text = (t.transcript + ' ' + t.summary).toLowerCase();
    const words = text.match(/[a-záéíóúüñ]{4,}/g) || [];
    for (const w of words) {
      if (!STOPWORDS.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    }
  }

  return Object.entries(freq)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function getAgentSentiment(transcriptions: Transcription[]): AgentSentiment[] {
  const agentMap: Record<string, { positive: number; negative: number; neutral: number; total: number }> = {};

  for (const t of transcriptions) {
    const agent = t.agent_name || 'Desconocido';
    if (!agentMap[agent]) {
      agentMap[agent] = { positive: 0, negative: 0, neutral: 0, total: 0 };
    }

    const text = (t.summary + ' ' + t.result).toLowerCase();
    let score = 0;

    for (const w of POSITIVE_WORDS) {
      if (text.includes(w)) score++;
    }
    for (const w of NEGATIVE_WORDS) {
      if (text.includes(w)) score--;
    }

    agentMap[agent].total++;
    if (score > 0) agentMap[agent].positive++;
    else if (score < 0) agentMap[agent].negative++;
    else agentMap[agent].neutral++;
  }

  return Object.entries(agentMap).map(([agent, s]) => ({
    agent,
    positive: s.total > 0 ? Math.round((s.positive / s.total) * 100) : 0,
    negative: s.total > 0 ? Math.round((s.negative / s.total) * 100) : 0,
    neutral: s.total > 0 ? Math.round((s.neutral / s.total) * 100) : 0,
    total: s.total,
  })).sort((a, b) => b.total - a.total);
}

function getCampaignResults(transcriptions: Transcription[]): { name: string; value: number }[] {
  const freq: Record<string, number> = {};
  for (const t of transcriptions) {
    const key = t.result || 'sin_resultado';
    freq[key] = (freq[key] || 0) + 1;
  }
  return Object.entries(freq)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function getRiskPhrases(transcriptions: Transcription[]): RiskPhrase[] {
  const results: RiskPhrase[] = [];
  for (const t of transcriptions) {
    const text = (t.transcript || '').toLowerCase();
    for (const phrase of RISK_PHRASES) {
      if (text.includes(phrase)) {
        const idx = text.indexOf(phrase);
        const context = t.transcript.substring(Math.max(0, idx - 40), Math.min(t.transcript.length, idx + phrase.length + 40));
        results.push({
          agent: t.agent_name || 'Desconocido',
          date: t.call_date || '',
          phrase,
          context: `...${context}...`,
        });
        break; // Una frase por transcripción
      }
    }
  }
  return results;
}

function getScatterData(transcriptions: Transcription[]): ScatterPoint[] {
  return transcriptions
    .filter(t => t.aht_segundos != null && t.aht_segundos > 0)
    .map(t => ({
      aht: t.aht_segundos!,
      result: t.result === 'promesa_pago' ? 1 : 0,
      agent: t.agent_name || 'Desconocido',
      resultLabel: t.result || 'sin_resultado',
    }));
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SpeechAnalytics() {
  const { clientId } = useClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('transcriptions')
          .select('id, agent_name, call_date, result, summary, transcript, campaign, aht_segundos')
          .eq('client_id', clientId)
          .limit(100);

        if (err) throw err;
        setTranscriptions(data || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error cargando transcripciones');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando transcripciones...</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 flex-1 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md">
          <AlertTriangle size={32} className="text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-foreground">Error al cargar transcripciones</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground italic">
            Nota: La tabla <code>transcriptions</code> debe existir en Supabase con columnas:
            client_id, agent_name, call_date, result, summary, transcript, campaign, aht_segundos.
          </p>
        </div>
      </div>
    );
  }

  // ── Estado vacío ───────────────────────────────────────────────────────────
  if (transcriptions.length === 0) {
    return (
      <div className="p-6 flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="p-4 rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto">
            <Mic size={28} className="text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Sin transcripciones disponibles</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No se encontraron transcripciones para este cliente en Supabase.
            Una vez que las grabaciones sean procesadas y transcritas, aparecerán aquí los análisis de temas, sentimiento y frases de riesgo.
          </p>
          <div className="text-xs text-muted-foreground border border-border rounded-lg p-3 text-left space-y-1">
            <p className="font-semibold text-foreground">Datos requeridos en Supabase:</p>
            <p>• Tabla: <code className="text-primary">transcriptions</code></p>
            <p>• Columnas: client_id, agent_name, call_date, result, summary, transcript, campaign, aht_segundos</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const wordFreq = getWordFrequency(transcriptions);
  const agentSentiment = getAgentSentiment(transcriptions);
  const campaignResults = getCampaignResults(transcriptions);
  const riskPhrases = getRiskPhrases(transcriptions);
  const scatterData = getScatterData(transcriptions);

  const totalPositive = Math.round(agentSentiment.reduce((s, a) => s + a.positive * a.total, 0) / transcriptions.length);
  const totalNegative = Math.round(agentSentiment.reduce((s, a) => s + a.negative * a.total, 0) / transcriptions.length);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto overflow-y-auto flex-1">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/15">
          <Mic size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Speech Analytics</h1>
          <p className="text-xs text-muted-foreground">
            {transcriptions.length} transcripciones analizadas · Análisis de temas, sentimiento y frases de riesgo
          </p>
        </div>
      </div>

      {/* KPI Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Transcripciones', value: transcriptions.length.toString(), icon: FileText, color: 'text-primary' },
          { label: 'Agentes', value: new Set(transcriptions.map(t => t.agent_name)).size.toString(), icon: Users, color: 'text-blue-400' },
          { label: 'Sentimiento positivo', value: `${totalPositive}%`, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Frases de riesgo', value: riskPhrases.length.toString(), icon: Shield, color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-card border border-border', stat.color)}>
              <stat.icon size={16} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Temas frecuentes + Resultados por campaña */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Temas frecuentes */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">Temas Frecuentes</h2>
          <p className="text-xs text-muted-foreground mb-4">Top 20 palabras significativas en transcripciones (excluye stopwords)</p>
          {wordFreq.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sin datos de transcripciones de texto disponibles.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={wordFreq} layout="vertical" margin={{ left: 8, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="word" tick={{ fontSize: 11, fill: '#9CA3AF' }} width={90} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1A1F2E', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Bar dataKey="count" name="Frecuencia" fill="#6334C0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 3. Resultados por campaña */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">Resultados por Tipo</h2>
          <p className="text-xs text-muted-foreground mb-4">Distribución de resultados en todas las llamadas analizadas</p>
          {campaignResults.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sin datos de resultados disponibles.</p>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={campaignResults}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#6B7280', strokeWidth: 1 }}
                  >
                    {campaignResults.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1A1F2E', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [`${value} llamadas`, 'Total']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Sentimiento por agente */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">Sentimiento por Agente</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Score calculado en base a palabras positivas/negativas en resúmenes de llamadas
        </p>
        {agentSentiment.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin datos de agentes disponibles.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agente</th>
                  <th className="pb-2 px-4 text-xs font-semibold text-emerald-400 uppercase tracking-wide">Positivo %</th>
                  <th className="pb-2 px-4 text-xs font-semibold text-red-400 uppercase tracking-wide">Negativo %</th>
                  <th className="pb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Neutro %</th>
                  <th className="pb-2 pl-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Llamadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agentSentiment.map((a) => (
                  <tr key={a.agent} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{a.agent}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full bg-emerald-500/20 flex-1 max-w-[80px]">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${a.positive}%` }} />
                        </div>
                        <span className="text-emerald-400 font-semibold text-xs w-8">{a.positive}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full bg-red-500/20 flex-1 max-w-[80px]">
                          <div className="h-full rounded-full bg-red-500" style={{ width: `${a.negative}%` }} />
                        </div>
                        <span className="text-red-400 font-semibold text-xs w-8">{a.negative}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-xs">{a.neutral}%</td>
                    <td className="py-2.5 pl-4 text-muted-foreground text-xs">{a.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 3: Frases de riesgo + Scatter duración vs resultado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 4. Frases de riesgo */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={15} className="text-red-400" />
            <h2 className="text-sm font-semibold text-foreground">Frases de Riesgo Detectadas</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Frases críticas identificadas en transcripciones que requieren atención del supervisor
          </p>
          {riskPhrases.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Shield size={24} className="text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-emerald-400">Sin frases de riesgo detectadas</p>
              <p className="text-xs text-muted-foreground">Ninguna transcripción contiene frases de alerta.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {riskPhrases.map((r, i) => (
                <div key={i} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-red-400">"{r.phrase}"</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{r.date}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Agente: <span className="text-foreground">{r.agent}</span></p>
                  <p className="text-[11px] text-muted-foreground mt-1 italic">"{r.context}"</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Duración vs Resultado */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">Duración vs Resultado</h2>
          <p className="text-xs text-muted-foreground mb-4">
            ¿Las llamadas más largas logran más promesas de pago? (1 = promesa, 0 = no contacto)
          </p>
          {scatterData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px]">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Sin datos de duración (aht_segundos) disponibles.</p>
                <p className="text-xs text-muted-foreground italic">Requiere columna aht_segundos en tabla transcriptions.</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  type="number"
                  dataKey="aht"
                  name="Duración (seg)"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Duración (seg)', position: 'insideBottom', offset: -5, fill: '#6B7280', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="result"
                  name="Resultado"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[-0.2, 1.2]}
                  tickFormatter={(v) => v === 1 ? 'Promesa' : v === 0 ? 'No cont.' : ''}
                />
                <Tooltip
                  contentStyle={{ background: '#1A1F2E', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name) => [
                    name === 'result' ? (value === 1 ? 'Promesa de pago' : 'No contacto') : `${value}s`,
                    name === 'result' ? 'Resultado' : 'Duración',
                  ]}
                />
                <Scatter
                  data={scatterData}
                  fill="#6334C0"
                  opacity={0.7}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
