import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { KPICard } from '@/components/KPICard';
import { KPICardCompact } from '@/components/KPICardCompact';
import { useRole } from '@/contexts/RoleContext';
import { getKPIsForRole, kpiData, conversationTrend, proactiveInsights } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Overview() {
  const { role } = useRole();
  const navigate = useNavigate();
  const roleKPIs = getKPIsForRole(role);
  const primaryKPIs = roleKPIs.slice(0, 4);
  const secondaryKPIs = kpiData.filter(k => !primaryKPIs.includes(k)).slice(0, 6);

  const [briefExpanded, setBriefExpanded] = useState(false);

  const greetings: Record<string, string> = {
    'CEO': 'Buenos días, CEO.',
    'VP Ventas': 'Buenos días, VP de Ventas.',
    'VP CX': 'Buenos días, VP de CX.',
    'COO': 'Buenos días, COO.',
  };

  const briefs: Record<string, { short: string; full: string }> = {
    'CEO': {
      short: 'Crediminuto / CrediSmart procesó 16,129 conversaciones el 30 de marzo. Cobranzas Colombia lidera con 9,174 llamadas (56.9%). Teresa Meza es tu agente top con 261 contactos. Variación vs. día anterior: N/D (se requiere CDR histórico).',
      full: 'La operación Colombia generó 12,430 llamadas (77.1%) y Perú 3,690 (22.9%). 81 agentes humanos activos de 162 disponibles. 44.4% del volumen (7,162 llamadas) pasó por el dialer automático wekall — excluido del análisis de agentes humanos. Tasa de contacto efectivo: 43.1% — 2 puntos bajo la mediana Latam (COPC 2024). Comparación semanal: N/D (se requiere CDR de múltiples días).',
    },
    'VP Ventas': {
      short: 'Cobranzas Colombia (9,174 llamadas) y Cobranzas Perú (3,550) concentran el 79% del volumen. Teresa Meza lidera con 261 contactos — 2.4x el promedio del equipo (110.7). Tendencia vs. semana anterior: N/D.',
      full: 'Top 5 agentes por volumen (CDR 30-Mar-2026): Teresa Meza (261), Juan Gutierrez (211), Nelcy Contasti (194), Santiago Cano (183), Alejandra Perez (180). El cuartil inferior (20 agentes) promedia 76 llamadas/día — brecha de 35 llamadas/agente vs. el promedio del equipo.',
    },
    'VP CX': {
      short: 'Servicio al Cliente Colombia: 3,256 llamadas el 30 de marzo. Servicio al Cliente Perú: 140 llamadas. FCR por agente: N/D (requiere integración Engage360). Variación vs. día anterior: N/D.',
      full: 'Jennifer Loaiza y Alejandra Perez son top performers en CX por volumen. Servicio Perú (140 llamadas) representa solo el 0.9% del total — desproporcionado vs. el 22% de volumen en cobranzas Perú. CSAT y FCR individual: N/D (requiere análisis adicional de transcripciones o datos Engage360).',
    },
    'COO': {
      short: '81 agentes activos de 162 en plataforma — 50% de utilización del pool. 7,162 llamadas del dialer automático (44.4%). AHT: 8.1 min vs. benchmark Colombia 7.8 min (P50, CCContact 2024). Variación semana anterior: N/D.',
      full: 'Cuartil inferior: 20 agentes con menos de 76 llamadas/día (bottom: Paola Joya 4, Yuleidy Gonzalez 7, Vannesa Sauce 9). El dialer automático maneja el mayor volumen individual — excluido del análisis de productividad humana. AHT brecha vs. P50: +0.3 min = COP ~$592,000/día de capacidad por encima del benchmark. Utilización de agentes: N/D (requiere datos de login/logout de Engage360).',
    },
  };

  const brief = briefs[role] || briefs['CEO'];

  const iconMap = {
    warning: <AlertTriangle size={16} className="text-amber-400" />,
    success: <TrendingUp size={16} className="text-emerald-400" />,
    info: <BarChart2 size={16} className="text-blue-400" />,
  };

  const bgMap = {
    warning: 'border-amber-500/20 bg-amber-500/5',
    success: 'border-emerald-500/20 bg-emerald-500/5',
    info: 'border-blue-500/20 bg-blue-500/5',
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* Executive Brief */}
      <div className="animate-fade-slide-down rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/15 mt-0.5">
              <Lightbulb size={16} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-1">
                Executive Brief · Hoy
              </p>
              <p className="text-sm font-semibold text-foreground mb-1">{greetings[role]}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{brief.short}</p>
              {briefExpanded && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed animate-fade-in">
                  {brief.full}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setBriefExpanded(v => !v)}
            className="shrink-0 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-0.5"
          >
            {briefExpanded ? (
              <><ChevronUp size={14} /> Menos</>
            ) : (
              <><ChevronDown size={14} /> Ver análisis</>
            )}
          </button>
        </div>
      </div>

      {/* Primary KPIs */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          KPIs Principales — Vista {role}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {primaryKPIs.map((kpi, i) => (
            <KPICard
              key={kpi.id}
              kpi={kpi}
              className={`animate-stagger-${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Chart + Insights row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tendencia de Conversaciones</h2>
              <p className="text-xs text-muted-foreground">Últimos 7 días</p>
              <p className="text-xs text-amber-600 mt-1">* Estimado · ✓ Dato real CDR 30-Mar-2026</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-primary rounded-full inline-block" />
                Total
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block" />
                Resueltas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-500 rounded-full inline-block" />
                Escaladas
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={conversationTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6334C0" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#6334C0" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E8EF" />
              <XAxis dataKey="day" tick={{ fill: '#3D4A60', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#3D4A60', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #E4E8EF', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#12172A' }}
              />
              <Area type="monotone" dataKey="total" name="Total" stroke="#6334C0" strokeWidth={2} fill="url(#gTotal)" />
              <Area type="monotone" dataKey="resolved" name="Resueltas" stroke="#22C55E" strokeWidth={2} fill="url(#gResolved)" />
              <Area type="monotone" dataKey="escalated" name="Escaladas" stroke="#EF4444" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Proactive Insights */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Insights del Día
          </h2>
          {proactiveInsights.map((insight) => (
            <div
              key={insight.id}
              className={cn('rounded-lg border p-4 cursor-pointer hover:brightness-110 transition-all', bgMap[insight.type])}
              onClick={() => navigate('/vicky', { state: { question: insight.question } })}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">{iconMap[insight.type]}</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                  <p className="mt-2 text-xs text-primary font-medium">{insight.action}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary KPIs */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Métricas Secundarias
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {secondaryKPIs.map((kpi, i) => (
            <KPICardCompact
              key={kpi.id}
              kpi={kpi}
              className={`animate-fade-slide-up animate-stagger-${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
