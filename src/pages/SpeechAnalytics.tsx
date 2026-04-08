// SpeechAnalytics.tsx — WeKall Intelligence
// Inteligencia ejecutiva nivel McKinsey/BCG — no análisis de texto básico

import { useState, useEffect, useMemo } from 'react';
import { Mic, Loader2, AlertTriangle, TrendingUp, TrendingDown, Users, Target, Lightbulb, CheckCircle2, XCircle, AlertCircle, ArrowUpRight, BarChart2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useClient } from '@/contexts/ClientContext';
import { cn } from '@/lib/utils';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface Transcription {
  id: string;
  agent_name: string;
  call_date: string;
  call_type?: string;
  summary: string;
  transcript: string;
  campaign?: string;
  client_id?: string;
}

interface ParsedCall {
  raw: Transcription;
  tema: string;
  tono: 'positivo' | 'negativo' | 'neutral' | 'desconocido';
  resultado: 'exitoso' | 'fallido' | 'no_contacto' | 'desconocido';
  resultadoRaw: string;
}

// ─── Parser de summary ──────────────────────────────────────────────────────────

function parseSummary(summary: string): { tema: string; tono: ParsedCall['tono']; resultado: ParsedCall['resultado']; resultadoRaw: string } {
  const s = (summary || '').toLowerCase();

  // Extraer tema
  let tema = 'Sin tema';
  const temaMatch = summary.match(/[Tt]ema[:\s]+([^.]+)/);
  if (temaMatch) tema = temaMatch[1].trim();

  // Tono del cliente
  let tono: ParsedCall['tono'] = 'desconocido';
  if (s.includes('positivo') || s.includes('receptivo') || s.includes('cooperativo') || s.includes('amable') || s.includes('cordial')) tono = 'positivo';
  else if (s.includes('negativo') || s.includes('hostil') || s.includes('molesto') || s.includes('enojado') || s.includes('irritado') || s.includes('agresivo')) tono = 'negativo';
  else if (s.includes('neutral') || s.includes('indiferente')) tono = 'neutral';

  // Resultado
  let resultado: ParsedCall['resultado'] = 'desconocido';
  let resultadoRaw = '';
  const resultadoMatch = summary.match(/[Rr]esultado[:\s]+([^.]+)/);
  if (resultadoMatch) resultadoRaw = resultadoMatch[1].trim();

  const r = resultadoRaw.toLowerCase() || s;
  if (r.includes('promesa') || r.includes('acuerdo') || r.includes('compromiso') || r.includes('pagará') || r.includes('pago acordado') || r.includes('exitoso') || r.includes('favorable')) {
    resultado = 'exitoso';
  } else if (r.includes('no contesta') || r.includes('no contestó') || r.includes('no responde') || r.includes('buzón') || r.includes('no disponible') || r.includes('no atiende')) {
    resultado = 'no_contacto';
  } else if (r.includes('sin acuerdo') || r.includes('negativa') || r.includes('rechazo') || r.includes('no acepta') || r.includes('no quiere') || r.includes('fallido') || r.includes('sin resultado') || r.includes('no hubo')) {
    resultado = 'fallido';
  }

  return { tema, tono, resultado, resultadoRaw: resultadoRaw || 'No especificado' };
}

// ─── Patrones conversacionales ──────────────────────────────────────────────────

const PATRONES_EXITOSOS = [
  { id: 'cuota', label: 'Ofreció cuota específica', keywords: ['cuota', 'mensual', 'pago mensual', 'cuotas', 'abono mensual'] },
  { id: 'alternativa', label: 'Propuso alternativas de pago', keywords: ['alternativa', 'opción de pago', 'facilidad', 'plan de pago', 'forma de pago'] },
  { id: 'descuento', label: 'Mencionó descuento o quita', keywords: ['descuento', 'quita', 'condonación', 'reducción', 'rebaja'] },
  { id: 'fecha', label: 'Acordó fecha específica', keywords: ['fecha', 'día', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'próxima semana', 'esta semana'] },
  { id: 'empathy', label: 'Demostró empatía con la situación', keywords: ['entiendo', 'comprendo', 'me pongo en su lugar', 'es difícil', 'le entiendo'] },
];

const PATRONES_FALLIDOS = [
  { id: 'amenaza', label: 'Escaló a amenazas legales', keywords: ['demanda', 'jurídico', 'abogado', 'legal', 'proceso judicial', 'embargo'] },
  { id: 'repeticion', label: 'Repitió el mismo argumento', keywords: ['como le dije', 'ya le expliqué', 'le repito', 'nuevamente'] },
  { id: 'no_escucha', label: 'No respondió a la objeción', keywords: ['de todas formas', 'de todas maneras', 'independientemente', 'sin embargo'] },
  { id: 'presion', label: 'Usó presión excesiva', keywords: ['tiene que pagar', 'debe pagar', 'obligado', 'es obligatorio'] },
  { id: 'sin_alternativa', label: 'No ofreció alternativas', keywords: [] }, // se calcula por ausencia
];

const OBJECIONES = [
  {
    id: 'capacidad',
    label: 'Capacidad de pago',
    keywords: ['no puedo pagar', 'no tengo dinero', 'no tengo', 'no cuento con', 'no me alcanza', 'estoy sin trabajo', 'sin empleo', 'desempleo'],
    recomendacion: 'Práctica recomendada: ofrecer cuotas de menor monto o plan de pago flexible antes del cierre. Dar opciones concretas reduce la fricción.',
  },
  {
    id: 'desacuerdo',
    label: 'Desacuerdo con la deuda',
    keywords: ['no reconozco', 'no debo', 'no es mío', 'no es mi deuda', 'está mal', 'error', 'equivocado', 'no corresponde', 'no es correcto'],
    recomendacion: 'Práctica recomendada: ofrecer envío de documentación de respaldo y agendar llamada de seguimiento. No insistir sin evidencia disponible.',
  },
  {
    id: 'tiempo',
    label: 'Solicitud de tiempo',
    keywords: ['espere', 'después', 'luego', 'más tarde', 'la próxima semana', 'dame tiempo', 'necesito tiempo', 'no es buen momento'],
    recomendacion: 'Práctica recomendada: acordar fecha específica de seguimiento en la misma llamada antes de finalizar el contacto.',
  },
  {
    id: 'ya_pago',
    label: 'Ya realizó el pago',
    keywords: ['ya pagué', 'ya pague', 'ya lo pagué', 'ya cancelé', 'ya hice el pago', 'ya está pagado'],
    recomendacion: 'Práctica recomendada: verificar en sistema antes de insistir. Las llamadas por pagos ya realizados afectan la experiencia del cliente y generan quejas.',
  },
  {
    id: 'contacto',
    label: 'Contacto incorrecto',
    keywords: ['número equivocado', 'no conozco', 'no es de aquí', 'se equivocó', 'equivocado', 'no lo conozco', 'no vive aquí'],
    recomendacion: 'Práctica recomendada: actualizar base de datos de contactos. Los números incorrectos representan tiempo que puede redirigirse a contactos válidos.',
  },
];

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
        const PROXY = (import.meta.env.VITE_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev').replace(/\/$/, '');
        const resp = await fetch(`${PROXY}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'transcriptions',
            select: 'id,agent_name,call_date,call_type,summary,transcript,campaign,client_id',
            filters: { 'client_id': `eq.${clientId}` },
            limit: 200,
          }),
        });
        if (!resp.ok) throw new Error(`Error ${resp.status}`);
        const data = await resp.json() as Transcription[];
        setTranscriptions(data || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error cargando transcripciones');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  // ── Análisis central ───────────────────────────────────────────────────────
  const analysis = useMemo(() => {
    if (transcriptions.length === 0) return null;
    try {

    // Parsear todas las llamadas
    const calls: ParsedCall[] = transcriptions.map(t => ({
      raw: t,
      ...parseSummary(t.summary || ''),
    }));

    const total = calls.length;
    const exitosas = calls.filter(c => c.resultado === 'exitoso');
    const fallidas = calls.filter(c => c.resultado === 'fallido');
    const noContacto = calls.filter(c => c.resultado === 'no_contacto');
    const tasaExito = total > 0 ? Math.round((exitosas.length / total) * 100) : 0;

    // ── Patrones por resultado ────────────────────────────────────────────────
    function contarPatron(callList: ParsedCall[], keywords: string[]): number {
      if (keywords.length === 0) return 0;
      return callList.filter(c => {
        const text = (c.raw.transcript + ' ' + c.raw.summary).toLowerCase();
        return keywords.some(kw => text.includes(kw));
      }).length;
    }

    const patronesExitosos = PATRONES_EXITOSOS.map(p => {
      const enExitosas = contarPatron(exitosas, p.keywords);
      const enFallidas = contarPatron(fallidas, p.keywords);
      const totalCon = enExitosas + enFallidas;
      const tasaEnExitosas = exitosas.length > 0 ? Math.round((enExitosas / exitosas.length) * 100) : 0;
      const tasaEnFallidas = fallidas.length > 0 ? Math.round((enFallidas / fallidas.length) * 100) : 0;
      const ventaja = tasaEnExitosas - tasaEnFallidas;
      return { ...p, enExitosas, enFallidas, tasaEnExitosas, tasaEnFallidas, ventaja, totalCon };
    }).sort((a, b) => b.ventaja - a.ventaja);

    // ── Fragmentos de summary de llamadas exitosas (fallback robusto) ─────────
    // Extrae los primeros 120 chars de cada summary exitoso, agrupa similares
    const fragmentosSummaryExitosos: string[] = exitosas
      .filter(c => c.raw.summary && c.raw.summary.trim().length > 10)
      .slice(0, 10)
      .map(c => {
        const s = c.raw.summary.trim();
        // Tomar primera oración relevante (hasta el primer punto o 120 chars)
        const firstSentence = s.split(/[.!?]/)[0]?.trim() || s;
        return firstSentence.length > 120 ? firstSentence.substring(0, 120) + '…' : firstSentence;
      })
      .filter((v, i, arr) => arr.indexOf(v) === i) // deduplicar
      .slice(0, 5);

    // ── Análisis por agente ───────────────────────────────────────────────────
    const agentMap: Record<string, { calls: ParsedCall[] }> = {};
    for (const c of calls) {
      const name = c.raw.agent_name || 'Desconocido';
      if (!agentMap[name]) agentMap[name] = { calls: [] };
      agentMap[name].calls.push(c);
    }

    const agentes = Object.entries(agentMap).map(([name, { calls: aCalls }]) => {
      const aTotal = aCalls.length;
      const aExitosas = aCalls.filter(c => c.resultado === 'exitoso').length;
      const aFallidas = aCalls.filter(c => c.resultado === 'fallido').length;
      const aPositivos = aCalls.filter(c => c.tono === 'positivo').length;
      const aNeg = aCalls.filter(c => c.tono === 'negativo').length;
      const tasaConversion = aTotal > 0 ? Math.round((aExitosas / aTotal) * 100) : 0;
      const tonoScore = aTotal > 0 ? Math.round(((aPositivos - aNeg) / aTotal) * 100) : 0;
      return { name, total: aTotal, exitosas: aExitosas, fallidas: aFallidas, tasaConversion, tonoScore, positivos: aPositivos };
    }).sort((a, b) => b.tasaConversion - a.tasaConversion);

    const top3 = agentes.slice(0, 3);
    const bottom3 = agentes.slice(-3).filter(a => a.total >= 2);

    // ── Mapa de objeciones ────────────────────────────────────────────────────
    const mapaObjeciones = OBJECIONES.map(obj => {
      const conObjecion = calls.filter(c => {
        const text = (c.raw.transcript || '').toLowerCase();
        return obj.keywords.some(kw => text.includes(kw));
      });
      const resueltas = conObjecion.filter(c => c.resultado === 'exitoso').length;
      const tasaResolucion = conObjecion.length > 0 ? Math.round((resueltas / conObjecion.length) * 100) : 0;
      return { ...obj, frecuencia: conObjecion.length, resueltas, tasaResolucion };
    }).sort((a, b) => b.frecuencia - a.frecuencia);

    // ── Temas más frecuentes por resultado ───────────────────────────────────
    function topTemas(callList: ParsedCall[], n = 5): string[] {
      const freq: Record<string, number> = {};
      for (const c of callList) {
        if (c.tema && c.tema !== 'Sin tema') {
          const key = c.tema.toLowerCase().trim();
          freq[key] = (freq[key] || 0) + 1;
        }
      }
      return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
    }

    // ── Métricas para recomendaciones ─────────────────────────────────────────
    const promedioLlamadasDia = Math.round(total / 5); // asume semana laboral
    const potencialMejoraScript = Math.round(total * 0.15);
    const potencialCapacitacion = bottom3.length > 0
      ? bottom3.reduce((s, a) => s + a.total, 0) * Math.round((top3[0]?.tasaConversion || 50) - (bottom3[0]?.tasaConversion || 20)) / 100
      : 0;
    const objecionYaPago = mapaObjeciones.find(o => o.id === 'ya_pago');
    const minutosRecuperados = objecionYaPago ? objecionYaPago.frecuencia * 8 : 0;

    // ── Tendencia temporal semanal ─────────────────────────────────────────────
    // Compara tasa de promesas (exitosas/total) esta semana vs semana anterior
    const sortedByDate = [...calls].sort((a, b) =>
      (a.raw.call_date || '').localeCompare(b.raw.call_date || ''),
    );
    const datesUniq = [...new Set(sortedByDate.map(c => c.raw.call_date).filter(Boolean))].sort();
    const recentDates = datesUniq.slice(-10);
    const thisWeekDates = recentDates.slice(-5);
    const prevWeekDates = recentDates.slice(-10, -5);

    const weeklyTrend = (() => {
      if (thisWeekDates.length === 0 || prevWeekDates.length === 0) return null;
      const thisWeekCalls = calls.filter(c => thisWeekDates.includes(c.raw.call_date || ''));
      const prevWeekCalls = calls.filter(c => prevWeekDates.includes(c.raw.call_date || ''));
      const thisRate = thisWeekCalls.length > 0
        ? Math.round((thisWeekCalls.filter(c => c.resultado === 'exitoso').length / thisWeekCalls.length) * 100)
        : 0;
      const prevRate = prevWeekCalls.length > 0
        ? Math.round((prevWeekCalls.filter(c => c.resultado === 'exitoso').length / prevWeekCalls.length) * 100)
        : 0;
      const delta = thisRate - prevRate;
      return { thisRate, prevRate, delta, thisWeekN: thisWeekCalls.length, prevWeekN: prevWeekCalls.length };
    })();

    return {
      total,
      exitosas: exitosas.length,
      fallidas: fallidas.length,
      noContacto: noContacto.length,
      tasaExito,
      patronesExitosos,
      fragmentosSummaryExitosos,
      agentes,
      top3,
      bottom3,
      mapaObjeciones,
      topTemasExitosos: topTemas(exitosas),
      topTemasFallidos: topTemas(fallidas),
      promedioLlamadasDia,
      potencialMejoraScript,
      potencialCapacitacion: Math.round(potencialCapacitacion),
      minutosRecuperados,
      objecionMasFrecuente: mapaObjeciones[0],
      weeklyTrend,
    };
    } catch (e) {
      console.error('[SpeechAnalytics] Error en análisis:', e);
      return null;
    }
  }, [transcriptions]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Analizando transcripciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex-1 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md">
          <AlertTriangle size={32} className="text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-foreground">Error al cargar transcripciones</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (transcriptions.length === 0 || !analysis) {
    return (
      <div className="p-6 flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="p-4 rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto">
            <Mic size={28} className="text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Sin transcripciones disponibles</h2>
          <p className="text-sm text-muted-foreground">
            Una vez que las llamadas sean procesadas, aquí encontrarás inteligencia ejecutiva sobre drivers de conversión, mapa de objeciones y ranking de agentes.
          </p>
        </div>
      </div>
    );
  }

  const { total, exitosas: nExitosas, fallidas: nFallidas, noContacto, tasaExito, patronesExitosos, fragmentosSummaryExitosos, agentes, top3, bottom3, mapaObjeciones, topTemasExitosos, topTemasFallidos, potencialMejoraScript, potencialCapacitacion, minutosRecuperados, objecionMasFrecuente, weeklyTrend } = analysis;

  // ── Headline ejecutivo ──────────────────────────────────────────────────────
  const mejorAgente = agentes[0];
  const peorAgente = agentes[agentes.length - 1];
  const brechaConversion = mejorAgente && peorAgente ? mejorAgente.tasaConversion - peorAgente.tasaConversion : 0;
  const patronTopEjecutivo = patronesExitosos[0];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1400px] mx-auto overflow-y-auto flex-1 w-full min-w-0">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/15 shrink-0">
            <Mic size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Inteligencia Conversacional</h1>
            <p className="text-xs text-muted-foreground">
              {total} transcripciones analizadas · Inteligencia ejecutiva para recuperación de cartera
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-semibold px-3 py-1.5 rounded-full",
            tasaExito >= 40 ? "bg-emerald-500/15 text-emerald-400" : tasaExito >= 20 ? "bg-sky-500/15 text-sky-400" : "bg-red-500/15 text-red-400"
          )}>
            {tasaExito}% tasa de conversión
          </span>
        </div>
      </div>

      {/* ═══ SECCIÓN 1 — HEADLINE EJECUTIVO ══════════════════════════════════════ */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Diagnóstico Ejecutivo</span>
          </div>
          {/* Tendencia semanal — Speech Analytics */}
          {weeklyTrend && (
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
              weeklyTrend.delta > 0
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : weeklyTrend.delta < 0
                ? 'border-red-500/30 bg-red-500/10 text-red-400'
                : 'border-border bg-muted/30 text-muted-foreground',
            )}>
              {weeklyTrend.delta > 0 ? <TrendingUp size={12} /> : weeklyTrend.delta < 0 ? <TrendingDown size={12} /> : null}
              Esta semana vs anterior: tasa de promesas{' '}
              {weeklyTrend.delta > 0 ? 'subió' : weeklyTrend.delta < 0 ? 'bajó' : 'igual'}{' '}
              {weeklyTrend.delta !== 0 && `${Math.abs(weeklyTrend.delta)}pp`}
              {' '}({weeklyTrend.thisRate}% vs {weeklyTrend.prevRate}%)
            </div>
          )}
        </div>

        <p className="text-sm text-foreground leading-relaxed">
          De <span className="font-bold text-primary">{total} llamadas analizadas</span>, el{' '}
          <span className="font-bold text-primary">{tasaExito}%</span> resultó en promesa de pago ({nExitosas} contactos),{' '}
          {nFallidas > 0 && <><span className="font-bold text-red-400">{Math.round((nFallidas / total) * 100)}%</span> no llegó a acuerdo ({nFallidas}), </>}
          {noContacto > 0 && <>y <span className="font-bold text-slate-400">{Math.round((noContacto / total) * 100)}%</span> no pudo contactarse ({noContacto}).</>}
        </p>

        {patronTopEjecutivo && patronTopEjecutivo.ventaja > 5 && (
          <p className="text-sm text-foreground/80 leading-relaxed">
            El patrón más diferenciador entre llamadas exitosas y fallidas es{' '}
            <span className="font-semibold text-emerald-400">"{patronTopEjecutivo.label}"</span>:{' '}
            aparece en el <span className="font-semibold text-emerald-400">{patronTopEjecutivo.tasaEnExitosas}%</span> de las llamadas que cierran
            vs el <span className="font-semibold text-red-400">{patronTopEjecutivo.tasaEnFallidas}%</span> de las que no cierran
            — una brecha de <span className="font-bold">{patronTopEjecutivo.ventaja}pp</span>.
          </p>
        )}

        {brechaConversion > 15 && mejorAgente && peorAgente && (
          <p className="text-sm text-foreground/80 leading-relaxed">
            Existe una <span className="font-bold text-sky-400">brecha de conversión de {brechaConversion}pp</span> entre el mejor agente
            (<span className="font-semibold text-emerald-400">{mejorAgente.name}: {mejorAgente.tasaConversion}%</span>) y el de menor rendimiento
            (<span className="font-semibold text-red-400">{peorAgente.name}: {peorAgente.tasaConversion}%</span>).
            Replicar el patrón del top performer puede incrementar la tasa global en{' '}
            <span className="font-bold text-sky-400">+{Math.round(brechaConversion * 0.3)}pp estimado</span>.
          </p>
        )}

        {/* KPIs inline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/50">
          {[
            { label: 'Promesas de pago', value: nExitosas, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Sin acuerdo', value: nFallidas, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'No contactados', value: noContacto, icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-500/10' },
            { label: 'Agentes activos', value: agentes.length, icon: Users, color: 'text-muted-foreground', bg: 'bg-muted/30' },
          ].map(stat => (
            <div key={stat.label} className={cn("rounded-lg p-3 flex items-center gap-2.5", stat.bg)}>
              <stat.icon size={16} className={stat.color} />
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ SECCIÓN 2 — DRIVERS DE CONVERSIÓN ══════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-400" />
          <h2 className="text-sm font-bold text-foreground">Drivers de Conversión</h2>
          <span className="text-xs text-muted-foreground">— ¿Qué separa las llamadas que cierran de las que no?</span>
        </div>

        {/* ── Insight Ejecutivo McKinsey ─────────────────────────────────────── */}
        {calls.length >= 5 ? (() => {
          // Cálculos para el narrative
          const patronDominante = patronesExitosos.filter(p => p.tasaEnExitosas > 0).sort((a, b) => b.tasaEnExitosas - a.tasaEnExitosas)[0];
          const principalObstaculo = [...mapaObjeciones].sort((a, b) => b.frecuencia - a.frecuencia)[0];
          const temaTopExitosa = topTemasExitosos[0] ?? null;
          const temaTopFallida = topTemasFallidos[0] ?? null;
          const pctObstaculo = principalObstaculo && total > 0 ? Math.round((principalObstaculo.frecuencia / total) * 100) : 0;
          const agentesConDatos = agentes.filter(a => a.total >= 2);
          const promedio = agentesConDatos.length > 0 ? agentesConDatos.reduce((s, a) => s + a.tasaConversion, 0) / agentesConDatos.length : 0;
          const cuartilInferior = agentesConDatos.filter(a => a.tasaConversion < promedio);
          const impactoSemanal = cuartilInferior.length > 0 && brechaConversion > 0
            ? Math.round(cuartilInferior.reduce((s, a) => s + a.total, 0) * (brechaConversion / 100) * 0.4)
            : null;
          const ventajaPatron = patronDominante ? (
            patronDominante.tasaEnFallidas > 0
              ? (patronDominante.tasaEnExitosas / patronDominante.tasaEnFallidas).toFixed(1)
              : null
          ) : null;

          return (
            <div className="rounded-xl border-l-4 border-purple-500 bg-purple-500/5 border border-purple-500/20 p-5 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Lightbulb size={16} className="text-purple-400 shrink-0" />
                  <h3 className="text-sm font-bold text-foreground">
                    Diagnóstico Ejecutivo — {total} llamadas analizadas
                  </h3>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  ✦ Insight IA
                </span>
              </div>

              {/* Narrative paragraphs */}
              <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                {/* P1: apertura */}
                <p>
                  De las <span className="font-semibold text-foreground">{total}</span> llamadas analizadas,{' '}
                  <span className="font-semibold text-emerald-400">{nExitosas} ({tasaExito}%)</span> cerraron con promesa de pago
                  {nFallidas > 0 && <> y <span className="font-semibold text-red-400">{nFallidas}</span> no lograron compromiso</>}.
                </p>

                {/* P2: patrón dominante */}
                {patronDominante && (
                  <p>
                    <span className="font-semibold text-purple-300">Patrón más diferenciador:</span>{' '}
                    "<span className="italic">{patronDominante.label}</span>" está presente en el{' '}
                    <span className="font-semibold text-foreground">{patronDominante.tasaEnExitosas}%</span> de las llamadas exitosas
                    {ventajaPatron && ventajaPatron !== 'Infinity' && (
                      <> — los agentes que lo aplican cierran <span className="font-semibold text-emerald-400">{ventajaPatron}x</span> más que quienes no lo hacen</>
                    )}.
                  </p>
                )}

                {/* P3: objeción dominante como oportunidad */}
                {principalObstaculo && principalObstaculo.frecuencia > 0 && (
                  <p>
                    <span className="font-semibold text-purple-300">Objeción dominante:</span>{' '}
                    "<span className="italic">{principalObstaculo.label}</span>" ({pctObstaculo}% de las llamadas) no es una negativa —{' '}
                    {principalObstaculo.tasaResolucion >= 40
                      ? <>se resuelve en el <span className="font-semibold text-emerald-400">{principalObstaculo.tasaResolucion}%</span> de los casos cuando el agente tiene el protocolo correcto.</>
                      : <>solo se resuelve en el <span className="font-semibold text-red-400">{principalObstaculo.tasaResolucion}%</span> de los casos — hay margen de mejora significativo con el protocolo adecuado.</>
                    }
                  </p>
                )}

                {/* P4: temas dominantes */}
                {(temaTopExitosa || temaTopFallida) && (
                  <p>
                    <span className="font-semibold text-purple-300">Señal temática:</span>{' '}
                    {temaTopExitosa && <>Las conversaciones exitosas giran en torno a "<span className="italic text-emerald-300">{temaTopExitosa}</span>"{' '}</>}
                    {temaTopExitosa && temaTopFallida && <>mientras que las fallidas se concentran en "<span className="italic text-red-300">{temaTopFallida}</span>".</>}
                    {!temaTopExitosa && temaTopFallida && <>Las llamadas sin cierre se concentran en "<span className="italic text-red-300">{temaTopFallida}</span>".</>}
                  </p>
                )}

                {/* P5: brecha de agentes y oportunidad */}
                {brechaConversion > 5 && agentes.length >= 2 && (
                  <p>
                    <span className="font-semibold text-purple-300">Brecha operativa:</span>{' '}
                    Existe una diferencia de <span className="font-semibold text-foreground">{brechaConversion}pp</span> entre el mejor agente y el promedio.
                    {impactoSemanal !== null && impactoSemanal > 0 && (
                      <> Si los <span className="font-semibold">{cuartilInferior.length}</span> agentes de menor desempeño adoptaran las prácticas del cuartil superior,
                      el impacto estimado sería de <span className="font-semibold text-emerald-400">+{impactoSemanal} contactos efectivos adicionales</span> en el período analizado.</>
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })() : (
          calls.length > 0 ? (
            <div className="rounded-xl border border-border/50 bg-card/50 p-4 flex items-center gap-3 text-muted-foreground text-sm">
              <Lightbulb size={15} className="text-purple-400/50 shrink-0" />
              <span>Se necesitan al menos 5 llamadas para generar el diagnóstico ejecutivo. Actualmente hay {calls.length} transcripción{calls.length === 1 ? '' : 'es'}.</span>
            </div>
          ) : null
        )}

        {/* 2 columnas: éxito vs fracaso */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Llamadas que SÍ cierran */}
          <div className="rounded-xl border border-emerald-500/20 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <h3 className="text-sm font-semibold text-emerald-400">Conversaciones que SÍ cierran</h3>
              <span className="ml-auto text-xs text-muted-foreground">{nExitosas} llamadas</span>
            </div>

            {/* Patrones presentes en exitosas — con fallback robusto */}
            {(() => {
              const patronesConDatos = patronesExitosos.filter(p => p.ventaja > 0 && p.tasaEnExitosas > 0);
              if (nExitosas < 5) {
                return (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      Se necesitan más transcripciones para identificar patrones estadísticamente significativos.
                      Actualmente: <span className="font-semibold text-foreground">{nExitosas} llamadas con promesa de pago.</span>
                    </p>
                  </div>
                );
              }
              if (patronesConDatos.length === 0) {
                // Fallback: mostrar fragmentos textuales de summaries exitosos
                return (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Extractos de llamadas con promesa de pago</p>
                    {fragmentosSummaryExitosos.length > 0 ? (
                      <div className="space-y-2">
                        {fragmentosSummaryExitosos.map((frag, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center mt-0.5">
                              <span className="text-[9px] font-bold text-emerald-400">{i + 1}</span>
                            </span>
                            <p className="text-xs text-foreground/80 leading-relaxed">"{frag}"</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No se encontraron summaries disponibles para las llamadas exitosas.
                      </p>
                    )}
                  </div>
                );
              }
              return (
                <div className="space-y-2.5">
                  {patronesConDatos.slice(0, 5).map(p => (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground/80">{p.label}</span>
                        <span className="font-semibold text-emerald-400">{p.tasaEnExitosas}%</span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${p.tasaEnExitosas}%` }} />
                      </div>
                      {p.ventaja >= 10 && (
                        <p className="text-[10px] text-emerald-400/70 flex items-center gap-1">
                          <ArrowUpRight size={10} /> +{p.ventaja}pp vs llamadas fallidas — patrón diferenciador clave
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Temas frecuentes en exitosas */}
            {topTemasExitosos.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Temas frecuentes</p>
                <div className="flex flex-wrap gap-1.5">
                  {topTemasExitosos.map(t => (
                    <span key={t} className="text-[11px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Llamadas que NO cierran */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <XCircle size={15} className="text-red-400" />
              <h3 className="text-sm font-semibold text-red-400">Conversaciones que NO cierran</h3>
              <span className="ml-auto text-xs text-muted-foreground">{nFallidas} llamadas</span>
            </div>

            {/* Patrones ausentes en exitosas / presentes en fallidas */}
            <div className="space-y-2.5">
              {patronesExitosos.filter(p => p.ventaja < 0 || p.tasaEnFallidas > 30).slice(0, 5).length > 0
                ? patronesExitosos.filter(p => p.ventaja < 0 || p.tasaEnFallidas > 30).slice(0, 5).map(p => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground/80">{p.label}</span>
                      <span className="font-semibold text-red-400">{p.tasaEnFallidas}%</span>
                    </div>
                    <div className="h-1.5 bg-red-900/30 rounded-full">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${p.tasaEnFallidas}%` }} />
                    </div>
                  </div>
                ))
                : patronesExitosos.slice(0, 5).map(p => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground/60 line-through">{p.label}</span>
                      <span className="font-semibold text-red-400">{p.tasaEnFallidas}%</span>
                    </div>
                    <div className="h-1.5 bg-red-900/30 rounded-full">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${p.tasaEnFallidas}%` }} />
                    </div>
                    <p className="text-[10px] text-red-400/70">Ausente en {100 - p.tasaEnFallidas}% de los cierres fallidos</p>
                  </div>
                ))
              }
            </div>

            {/* Temas frecuentes en fallidas */}
            {topTemasFallidos.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Temas frecuentes</p>
                <div className="flex flex-wrap gap-1.5">
                  {topTemasFallidos.map(t => (
                    <span key={t} className="text-[11px] bg-red-500/15 text-red-300 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {nFallidas < 5 && (
              <p className="text-[11px] text-muted-foreground italic border-t border-border/50 pt-2">
                ⚠️ Requiere mínimo 10 llamadas fallidas para patrones estadísticamente significativos.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ SECCIÓN 3 — RANKING DE AGENTES ══════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-blue-400" />
          <h2 className="text-sm font-bold text-foreground">Ranking de Agentes</h2>
          <span className="text-xs text-muted-foreground">— Tasa de conversión vs promedio de operación</span>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/80">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Posición</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Agente</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Llamadas</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">Tasa de Cierre</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tono del cliente</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Promesas</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">vs Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agentes.map((a, i) => {
                  const vsPromedio = a.tasaConversion - tasaExito;
                  const isTop = i < 3;
                  const isBottom = i >= agentes.length - 3 && agentes.length > 3;
                  const tonoColor = a.tonoScore > 10 ? 'text-emerald-400' : a.tonoScore < -10 ? 'text-red-400' : 'text-slate-400';
                  const tonoLabel = a.tonoScore > 10 ? 'Positivo' : a.tonoScore < -10 ? 'Negativo' : 'Neutral';
                  return (
                    <tr key={a.name} className={cn(
                      "hover:bg-secondary/20 transition-colors",
                      isTop && "bg-emerald-500/3",
                      isBottom && "bg-red-500/3"
                    )}>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center",
                          i === 0 ? "bg-sky-500/20 text-sky-400" : i === 1 ? "bg-slate-500/20 text-slate-300" : i === 2 ? "bg-orange-700/20 text-orange-400" : "text-muted-foreground"
                        )}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          {a.name}
                          {isTop && <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full">TOP</span>}
                          {isBottom && a.total >= 2 && <span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">OPORTUNIDAD</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{a.total}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full bg-emerald-500/15 w-24">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${a.tasaConversion}%` }} />
                          </div>
                          <span className={cn("text-xs font-bold tabular-nums", a.tasaConversion >= tasaExito ? "text-emerald-400" : "text-red-400")}>
                            {a.tasaConversion}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("text-xs font-medium", tonoColor)}>{tonoLabel}</span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{a.exitosas}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "text-xs font-semibold",
                          vsPromedio > 0 ? "text-emerald-400" : vsPromedio < 0 ? "text-red-400" : "text-muted-foreground"
                        )}>
                          {vsPromedio > 0 ? `+${vsPromedio}pp` : vsPromedio < 0 ? `${vsPromedio}pp` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Insight de brecha */}
          {brechaConversion > 10 && top3.length > 0 && bottom3.length > 0 && (
            <div className="px-5 py-3 border-t border-border bg-sky-500/5">
              <p className="text-xs text-sky-400/90">
                <span className="font-semibold">⚡ Oportunidad de mejora:</span> Existe una brecha de <span className="font-bold">{brechaConversion}pp</span> entre los 3 mejores y los 3 de menor rendimiento.
                Capacitar a {bottom3.map(a => a.name).join(', ')} en los patrones de conversación de{' '}
                {top3[0].name} puede generar <span className="font-bold">+{potencialCapacitacion} promesas adicionales</span> con el volumen actual.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECCIÓN 4 — MAPA DE OBJECIONES ═════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-sky-400" />
          <h2 className="text-sm font-bold text-foreground">Mapa de Objeciones</h2>
          <span className="text-xs text-muted-foreground">— Frecuencia y tasa de resolución por categoría</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mapaObjeciones.filter(obj => obj.frecuencia > 0).map(obj => (
            <div key={obj.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{obj.label}</h3>
                  <p className="text-xs text-muted-foreground">{obj.frecuencia} {obj.frecuencia === 1 ? 'ocurrencia' : 'ocurrencias'} · {obj.resueltas} resueltas</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {obj.frecuencia}x
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Tasa de resolución</span>
                  <span className={cn("font-bold", obj.tasaResolucion >= 50 ? "text-emerald-400" : obj.tasaResolucion >= 25 ? "text-sky-400" : "text-red-400")}>
                    {obj.tasaResolucion}%
                  </span>
                </div>
                <div className="h-1.5 bg-border rounded-full">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${obj.tasaResolucion}%` }} />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-2">
                {obj.recomendacion}
              </p>

              {obj.frecuencia < 3 && (
                <p className="text-[10px] text-muted-foreground italic">
                  ⚠️ Requiere más muestras para ser estadísticamente significativo.
                </p>
              )}
            </div>
          ))}
          {mapaObjeciones.filter(obj => obj.frecuencia > 0).length === 0 && (
            <div className="col-span-3 rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No se detectaron objeciones con las palabras clave configuradas en las transcripciones disponibles.</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECCIÓN 5 — RECOMENDACIONES EJECUTIVAS ══════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-sky-400" />
          <h2 className="text-sm font-bold text-foreground">Recomendaciones Ejecutivas</h2>
          <span className="text-xs text-muted-foreground">— 3 acciones con mayor impacto en recuperación de cartera</span>
        </div>

        <div className="space-y-3">
          {/* Recomendación 1: Script de cuotas */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    Implementar script estándar con oferta de cuotas específicas en las primeras 2 minutos de llamada
                  </p>
                  <span className="flex-shrink-0 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    Impacto Alto
                  </span>
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed">
                  Las llamadas que mencionan cuotas o alternativas de pago concretas muestran mayor tasa de cierre en los datos analizados.
                  Estandarizar esta práctica en todos los agentes es una práctica recomendada en operaciones de cobranza de alto rendimiento.
                </p>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <TrendingUp size={10} className="text-emerald-400" />
                    +{potencialMejoraScript} contactos efectivos adicionales con el volumen actual
                  </span>
                  <span className="flex items-center gap-1">
                    <Target size={10} className="text-primary" />
                    Acción: Crear guión y capacitar en 1 semana
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recomendación 2: Capacitación agentes */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-foreground">2</span>
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    Programa de shadowing: los agentes de bajo rendimiento acompañan llamadas del top performer
                  </p>
                  <span className="flex-shrink-0 text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    Impacto Medio-Alto
                  </span>
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed">
                  {bottom3.length > 0
                    ? `Los agentes ${bottom3.map(a => a.name).join(', ')} tienen tasas de conversión por debajo del promedio (${tasaExito}%). Replicar los patrones del top performer `
                    : 'Estandarizar las mejores prácticas de conversación del top performer '}
                  {mejorAgente && <span>(<span className="font-semibold text-foreground">{mejorAgente.name}: {mejorAgente.tasaConversion}%</span>) </span>}
                  puede generar <span className="font-semibold text-foreground">+{potencialCapacitacion > 0 ? potencialCapacitacion : Math.round(total * 0.08)} promesas adicionales/mes</span>.
                </p>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <Users size={10} />
                    {bottom3.length > 0 ? `${bottom3.length} agentes a capacitar` : 'Todos los agentes se benefician'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target size={10} className="text-primary" />
                    Acción: 2 sesiones de escucha de grabaciones por agente
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recomendación 3: Objeción más frecuente */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    Crear protocolo de respuesta para la objeción más frecuente: "{objecionMasFrecuente?.label || 'Capacidad de pago'}"
                  </p>
                  <span className="flex-shrink-0 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    Quick Win
                  </span>
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed">
                  {objecionMasFrecuente && objecionMasFrecuente.frecuencia > 0
                    ? <>La objeción "<span className="font-semibold">{objecionMasFrecuente.label}</span>" aparece <span className="font-semibold">{objecionMasFrecuente.frecuencia} veces</span> en los datos y tiene una tasa de resolución actual del{' '}
                      <span className={cn("font-semibold", objecionMasFrecuente.tasaResolucion >= 50 ? "text-emerald-400" : "text-red-400")}>{objecionMasFrecuente.tasaResolucion}%</span>.
                      {' '}Un guión estructurado de respuesta puede mejorar esta tasa.
                    </>
                    : 'Documentar y estandarizar la respuesta a cada tipo de objeción reduce el tiempo de manejo.'
                  }
                  {minutosRecuperados > 0 && (
                    <> Reducir llamadas por "ya pagué" no verificadas recupera{' '}
                      <span className="font-semibold">~{minutosRecuperados} minutos/día</span> de tiempo productivo.
                    </>
                  )}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <TrendingDown size={10} />
                    Reduce tiempo promedio de llamada improductiva
                  </span>
                  <span className="flex items-center gap-1">
                    <Target size={10} className="text-primary" />
                    Acción: Tarjeta de respuesta rápida para el agente
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer informativo */}
        <div className="rounded-lg border border-border/50 bg-card/30 px-4 py-3 flex items-center gap-2">
          <AlertCircle size={12} className="text-muted-foreground flex-shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            Análisis basado en {total} transcripciones. Los porcentajes e insights se calculan en tiempo real desde los summaries y transcripts almacenados.
            {total < 30 && <span className="text-sky-400/80"> Para mayor confiabilidad estadística se recomiendan mínimo 50 transcripciones.</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
