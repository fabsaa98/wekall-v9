import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, Info, XCircle, Plus, Loader2, Bell, BellOff, History, Zap } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PageTabs, PageTabsBar } from '@/components/PageTabs';
import { Switch } from '@/components/ui/switch';
import { buildAlertsFromCDR, type Alert } from '@/data/mockData';
import { useCDRData } from '@/hooks/useCDRData';
import { insertAlertLog, getRecentAlertLog, type AlertLogEntry } from '@/lib/supabase';
import { useClient } from '@/contexts/ClientContext';
import { cn } from '@/lib/utils';

// ─── Umbrales de alerta — DEFAULTS ───────────────────────────────────────────
// Se sobreescriben con valores desde client_config en Supabase (Fix 1B)
// Estos son los fallbacks seguros en caso de que Supabase no responda

const DEFAULT_THRESHOLDS = {
  tasa_contacto_critica: 30,    // % — por debajo = crítico
  tasa_contacto_warning: 38,    // % — por debajo = advertencia
  delta_tasa_critico: -5,       // pp — caída vs promedio 7d = crítico
  delta_tasa_warning: -2.5,     // pp — caída vs promedio 7d = advertencia
  volumen_minimo: 5000,         // llamadas — por debajo = advertencia (día no hábil probable)
};

const exampleChips = [
  'CSAT baje de 3.5',
  'Conversión baje de 20%',
  'Escalaciones suban al 15%',
  'AHT supere los 8 min',
  'FCR baje del 70%',
  'Cliente repite llamada en 7 días',
  'Ocupación supere 90%',
];

// Nota: 'Cliente repite llamada en 7 días' es una alerta CX de recontacto.

// ─── Alertas configurables Engage360 (Sprint 2B) ─────────────────────────

interface Engage360AlertConfig {
  tipo: string;
  label: string;
  descripcion: string;
  disponible: boolean;
  fuente: string;
  severity: 'critical' | 'warning' | 'info';
  defaultUmbral: string;
}

const ENGAGE360_ALERTS: Engage360AlertConfig[] = [
  {
    tipo: 'conversion_baja',
    label: 'Tasa de conversión bajo umbral',
    descripcion: 'Avisa cuando la tasa de promesas/contactos cae del umbral configurado (VP Ventas)',
    disponible: true,
    fuente: 'agents_performance.tasa_promesa',
    severity: 'warning',
    defaultUmbral: '40%',
  },
  {
    tipo: 'csat_bajo',
    label: 'CSAT promedio bajo umbral',
    descripcion: 'Avisa cuando el CSAT del equipo baja de 3.5/5 (VP CX)',
    disponible: true,
    fuente: 'agents_performance.csat',
    severity: 'warning',
    defaultUmbral: '3.5/5',
  },
  {
    tipo: 'ocupacion_alta',
    label: 'Ocupación estimada > 90%',
    descripcion: 'Riesgo de burnout — ocupación supera límite COPC recomendado 75-85% (VP Ops)',
    disponible: true,
    fuente: 'agents_performance calculado',
    severity: 'critical',
    defaultUmbral: '90%',
  },
];
// Requiere datos de identificación de cliente en CDR para activarse automáticamente.
// Por ahora se muestra como chip informativo para configuración futura.
const RECONTACTO_CHIP_NOTE = 'Requiere datos de identificación de cliente en CDR';

const severityConfig = {
  critical: {
    icon: <XCircle size={16} />,
    label: 'Crítica',
    classes: 'text-red-400 bg-red-500/10 border-red-500/20',
    dot: 'bg-red-400',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    label: 'Advertencia',
    classes: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    dot: 'bg-sky-400',
  },
  info: {
    icon: <Info size={16} />,
    label: 'Info',
    classes: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    dot: 'bg-blue-400',
  },
};

// ─── Componente AlertCard ─────────────────────────────────────────────────────

function AlertCard({ alert, onToggle }: { alert: Alert; onToggle: (id: string) => void }) {
  const config = severityConfig[alert.severity];

  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 flex items-start gap-4 transition-all',
      alert.active ? 'border-border' : 'border-border/50 opacity-60',
    )}>
      <div className={cn('p-2 rounded-lg border shrink-0', config.classes)}>
        {config.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{alert.title}</p>
              <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-semibold border', config.classes)}>
                {config.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.description}</p>
          </div>
          <Switch
            checked={alert.active}
            onCheckedChange={() => onToggle(alert.id)}
            className="shrink-0 mt-0.5"
          />
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
            {alert.time}
          </span>
          <span>Umbral: {alert.threshold}{alert.metric.includes('%') || alert.metric.includes('FCR') || alert.metric.includes('Conv') ? '%' : ''}</span>
          <span className={cn(
            'font-medium',
            alert.current < alert.threshold ? 'text-red-400' : 'text-emerald-400',
          )}>
            Actual: {alert.current}{alert.metric.includes('%') || alert.metric.includes('FCR') || alert.metric.includes('Conv') ? '%' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Componente HistorialCard ─────────────────────────────────────────────────

function HistorialCard({ entry }: { entry: AlertLogEntry }) {
  const config = severityConfig[entry.severity];
  const ts = entry.fired_at ? new Date(entry.fired_at) : null;
  const timeStr = ts
    ? ts.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="rounded-lg border border-border bg-card p-3 flex items-start gap-3">
      <div className={cn('p-1.5 rounded-lg border shrink-0 mt-0.5', config.classes)}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground leading-snug">{entry.title}</p>
          <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0', config.classes)}>
            {config.label}
          </span>
        </div>
        {entry.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{entry.description}</p>
        )}
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{timeStr}</span>
          {entry.actual_value !== undefined && entry.threshold !== undefined && (
            <>
              <span>Umbral: {entry.threshold}</span>
              <span className={cn('font-medium', entry.actual_value < entry.threshold ? 'text-red-400' : 'text-emerald-400')}>
                Valor: {entry.actual_value}
              </span>
            </>
          )}
          <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">{entry.metric}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Escalación automática COPC ──────────────────────────────────────────────

interface EscalationConfig {
  level1_phone: string;       // supervisor — notificación inmediata
  level2_phone: string;       // gerente — si alerta persiste >30 min
  level2_delay_min: number;   // minutos antes de escalar a nivel 2
  level3_phone?: string;      // CEO — si persiste >2h (opcional)
}

// ─── Lógica de evaluación de KPIs vs umbrales ─────────────────────────────────
// Fix 1B: umbrales dinámicos desde client_config en lugar de constantes hardcodeadas

interface AlertThresholds {
  tasa_contacto_critica: number;
  tasa_contacto_warning: number;
  delta_tasa_critico: number;
  delta_tasa_warning: number;
  volumen_minimo: number;
}

function evaluateKPIAlerts(
  latestDay: { fecha: string; total_llamadas: number; contactos_efectivos: number; tasa_contacto_pct: number } | null,
  promedio7d: number,
  deltaTasa: number,
  thresholds: AlertThresholds,
): AlertLogEntry[] {
  if (!latestDay) return [];
  const toFire: AlertLogEntry[] = [];

  // 1. Tasa de contacto crítica
  if (latestDay.tasa_contacto_pct < thresholds.tasa_contacto_critica) {
    toFire.push({
      severity: 'critical',
      metric: 'tasa_contacto_pct',
      title: `⚠️ Tasa de contacto crítica: ${latestDay.tasa_contacto_pct}%`,
      description: `La tasa de contacto cayó a ${latestDay.tasa_contacto_pct}% el ${latestDay.fecha}, por debajo del umbral crítico de ${thresholds.tasa_contacto_critica}%. Promedio 7d: ${promedio7d}%.`,
      threshold: thresholds.tasa_contacto_critica,
      actual_value: latestDay.tasa_contacto_pct,
    });
  } else if (latestDay.tasa_contacto_pct < thresholds.tasa_contacto_warning) {
    toFire.push({
      severity: 'warning',
      metric: 'tasa_contacto_pct',
      title: `Tasa de contacto baja: ${latestDay.tasa_contacto_pct}%`,
      description: `La tasa de contacto del ${latestDay.fecha} (${latestDay.tasa_contacto_pct}%) está por debajo del umbral de ${thresholds.tasa_contacto_warning}%. Monitorear.`,
      threshold: thresholds.tasa_contacto_warning,
      actual_value: latestDay.tasa_contacto_pct,
    });
  }

  // 2. Caída brusca vs promedio 7d
  if (deltaTasa < thresholds.delta_tasa_critico) {
    toFire.push({
      severity: 'critical',
      metric: 'delta_tasa_contacto_7d',
      title: `Caída brusca de contacto: ${deltaTasa > 0 ? '+' : ''}${deltaTasa}pp vs promedio 7d`,
      description: `El ${latestDay.fecha} la tasa cayó ${Math.abs(deltaTasa)}pp respecto al promedio 7d (${promedio7d}%). Posible incidencia operativa o problema de marcador.`,
      threshold: thresholds.delta_tasa_critico,
      actual_value: deltaTasa,
    });
  } else if (deltaTasa < thresholds.delta_tasa_warning) {
    toFire.push({
      severity: 'warning',
      metric: 'delta_tasa_contacto_7d',
      title: `Tendencia negativa: ${deltaTasa > 0 ? '+' : ''}${deltaTasa}pp vs promedio 7d`,
      description: `La tasa de contacto del ${latestDay.fecha} cayó ${Math.abs(deltaTasa)}pp respecto al promedio 7d (${promedio7d}%).`,
      threshold: thresholds.delta_tasa_warning,
      actual_value: deltaTasa,
    });
  }

  // 3. Volumen bajo (posible día no hábil o problema de marcador)
  if (latestDay.total_llamadas < thresholds.volumen_minimo) {
    toFire.push({
      severity: 'warning',
      metric: 'total_llamadas',
      title: `Volumen inusualmente bajo: ${latestDay.total_llamadas.toLocaleString('es-CO')} llamadas`,
      description: `El ${latestDay.fecha} se procesaron ${latestDay.total_llamadas.toLocaleString()} llamadas, por debajo del mínimo esperado de ${thresholds.volumen_minimo.toLocaleString()}. ¿Es un día no hábil o hay un problema con el marcador?`,
      threshold: thresholds.volumen_minimo,
      actual_value: latestDay.total_llamadas,
    });
  }

  return toFire;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Alertas() {
  const cdr = useCDRData();
  const { clientConfig, clientId } = useClient(); // Fix 1B + H-2: clientId para multi-tenant security

  // Fix 1B: construir umbrales desde client_config, con fallback a defaults
  const thresholds: AlertThresholds = useMemo(() => ({
    tasa_contacto_critica: clientConfig?.alert_tasa_critica ?? DEFAULT_THRESHOLDS.tasa_contacto_critica,
    tasa_contacto_warning: clientConfig?.alert_tasa_warning ?? DEFAULT_THRESHOLDS.tasa_contacto_warning,
    delta_tasa_critico: clientConfig?.alert_delta_critico ?? DEFAULT_THRESHOLDS.delta_tasa_critico,
    delta_tasa_warning: clientConfig?.alert_delta_warning ?? DEFAULT_THRESHOLDS.delta_tasa_warning,
    volumen_minimo: clientConfig?.alert_volumen_minimo ?? DEFAULT_THRESHOLDS.volumen_minimo,
  }), [clientConfig]);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertTab, setAlertTab] = useState('active');
  const [nlInput, setNlInput] = useState('');
  const [addedMsg, setAddedMsg] = useState('');

  // Estado de escalación automática COPC
  const [escalationConfig, setEscalationConfig] = useState<EscalationConfig>({
    level1_phone: '',
    level2_phone: '',
    level2_delay_min: 30,
    level3_phone: '',
  });

  // Estado del historial de alert_log en Supabase
  const [alertHistory, setAlertHistory] = useState<AlertLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [firing, setFiring] = useState(false);
  const [fireMsg, setFireMsg] = useState('');

  // Cargar historial de alertas desde Supabase
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const entries = await getRecentAlertLog(clientId, 10);
      setAlertHistory(entries);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Error cargando historial');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Construir alertas locales desde CDR
  useEffect(() => {
    if (!cdr.loading && !cdr.error) {
      const dynamicAlerts = buildAlertsFromCDR(
        cdr.latestDay,
        cdr.promedio7dTasa,
        cdr.promedio30dTasa,
        cdr.deltaTasa,
      );
      setAlerts(dynamicAlerts);
    }
  }, [cdr.loading, cdr.error, cdr.latestDay, cdr.promedio7dTasa, cdr.promedio30dTasa, cdr.deltaTasa]);

  // Evaluar KPIs y disparar alertas a Supabase si superan umbrales
  const evaluateAndFireAlerts = useCallback(async (isManual = false) => {
    if (cdr.loading || cdr.error || !cdr.latestDay) {
      setFireMsg('❌ Sin datos CDR disponibles para evaluar');
      setTimeout(() => setFireMsg(''), 3000);
      return;
    }
    setFiring(true);
    setFireMsg('');

    const toFire = isManual
      ? [{
          severity: 'info' as const,
          metric: 'prueba_manual',
          title: `🧪 Alerta de prueba — ${new Date().toLocaleString('es-CO')}`,
          description: `Prueba manual disparada desde WeKall Intelligence. CDR fecha: ${cdr.latestDay.fecha}. Tasa: ${cdr.latestDay.tasa_contacto_pct}%. Volumen: ${cdr.latestDay.total_llamadas.toLocaleString()}.`,
          threshold: 0,
          actual_value: cdr.latestDay.tasa_contacto_pct,
        }]
      : evaluateKPIAlerts(cdr.latestDay, cdr.promedio7dTasa, cdr.deltaTasa, thresholds);

    if (toFire.length === 0) {
      setFireMsg('✅ Todos los KPIs dentro del rango normal — sin alertas que disparar');
      setFiring(false);
      setTimeout(() => setFireMsg(''), 4000);
      return;
    }

    let ok = 0;
    let fail = 0;
    for (const entry of toFire) {
      try {
        await insertAlertLog({ ...entry, client_id: clientId });
        ok++;
      } catch (e) {
        console.error('Error insertando alerta:', e);
        fail++;
      }
    }

    setFireMsg(
      fail === 0
        ? `✅ ${ok} alerta(s) registrada(s) en Supabase. GlorIA notificará vía cron.`
        : `⚠️ ${ok} OK · ${fail} fallaron (RLS — ver consola)`,
    );
    setFiring(false);
    setTimeout(() => setFireMsg(''), 5000);

    // Recargar historial
    loadHistory();
  }, [cdr, loadHistory, thresholds]);

  function toggleAlert(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  }

  function handleAddAlert(text: string) {
    if (!text.trim()) return;
    const newAlert: Alert = {
      id: `custom-${Date.now()}`,
      severity: 'info',
      title: `Alerta personalizada: "${text}"`,
      description: 'Configurada por lenguaje natural. Umbral detectado automáticamente.',
      time: 'recién creada',
      active: true,
      metric: text,
      threshold: 0,
      current: 0,
    };
    setAlerts(prev => [newAlert, ...prev]);
    setNlInput('');
    setAddedMsg('✅ Alerta creada correctamente');
    setTimeout(() => setAddedMsg(''), 3000);
  }

  const activeAlerts = alerts.filter(a => a.active);
  const firedAlerts = alerts.filter(a => !a.active);

  return (
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto space-y-4 sm:space-y-6 overflow-y-auto flex-1 w-full min-w-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alertas Inteligentes</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
            {cdr.loading ? (
              <><Loader2 size={12} className="animate-spin" /> Cargando datos desde Supabase...</>
            ) : cdr.error ? (
              <span className="text-red-400">Error Supabase: {cdr.error}</span>
            ) : (
              <>Datos en tiempo real desde Supabase · {activeAlerts.length} activas · CDR {cdr.latestDay?.fecha}</>
            )}
          </p>
        </div>

        {/* Botón Probar alerta */}
        <button
          onClick={() => evaluateAndFireAlerts(true)}
          disabled={firing || cdr.loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all disabled:opacity-50"
        >
          {firing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          Probar alerta
        </button>
      </div>

      {/* Feedback de disparo */}
      {fireMsg && (
        <div className={cn(
          'rounded-lg border px-4 py-2.5 text-sm font-medium animate-fade-in',
          fireMsg.startsWith('✅') ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
          fireMsg.startsWith('⚠️') ? 'border-sky-500/30 bg-sky-500/10 text-sky-400' :
          'border-red-500/30 bg-red-500/10 text-red-400',
        )}>
          {fireMsg}
        </div>
      )}

      {/* Botón Evaluar KPIs ahora */}
      {!cdr.loading && !cdr.error && cdr.latestDay && (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Evaluación automática de KPIs</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compara KPIs del último CDR ({cdr.latestDay.fecha}) vs umbrales y registra en Supabase.
              GlorIA procesa el alert_log vía cron para notificar.
            </p>
          </div>
          <button
            onClick={() => evaluateAndFireAlerts(false)}
            disabled={firing}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            {firing ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
            Evaluar ahora
          </button>
        </div>
      )}

      {/* Alertas Engage360 (Sprint 2B) */}
      <div className="rounded-xl border border-primary/20 bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={15} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Alertas Proactivas Engage360</p>
          <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">Nuevo</span>
        </div>
        <p className="text-xs text-muted-foreground">Basadas en datos reales de agents_performance — activa las alertas que necesitas por rol</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ENGAGE360_ALERTS.map(a => {
            const sc = severityConfig[a.severity];
            return (
              <div key={a.tipo} className={cn(
                'rounded-lg border p-3 space-y-1.5',
                sc.classes,
              )}>
                <div className="flex items-center gap-2">
                  <div className={cn('p-1 rounded border shrink-0', sc.classes)}>{sc.icon}</div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{a.label}</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{a.descripcion}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', sc.classes)}>
                    Umbral: {a.defaultUmbral}
                  </span>
                  <button
                    onClick={() => handleAddAlert(`${a.label} — ${a.descripcion}`)}
                    className="text-[10px] text-primary underline hover:text-primary/80 transition-colors"
                  >
                    + Activar
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">Fuente: {a.fuente}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* NL Alert Creator */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm font-semibold text-foreground">Crear alerta en lenguaje natural</p>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
            <span className="text-muted-foreground text-sm">Avísame cuando</span>
            <input
              value={nlInput}
              onChange={e => setNlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddAlert(nlInput)}
              placeholder="el CSAT baje de 3.5..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => handleAddAlert(nlInput)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            <Plus size={15} />
            Crear
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {exampleChips.map(chip => (
            <button
              key={chip}
              onClick={() => setNlInput(chip)}
              title={chip === 'Cliente repite llamada en 7 días' ? RECONTACTO_CHIP_NOTE : undefined}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs border transition-all',
                chip === 'Cliente repite llamada en 7 días'
                  ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10 cursor-help'
                  : 'border-primary/20 text-primary hover:bg-primary/10',
              )}
            >
              {chip === 'Cliente repite llamada en 7 días' ? '🔄 ' : ''}{chip}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-amber-400 mt-2">
          ⚠️ Los umbrales de CSAT y FCR requieren que tu CDR incluya estos campos. Contacta a WeKall para validar tu esquema de datos.
        </p>

        {/* Escalación automática COPC */}
        <div className="space-y-3 border-t border-border pt-4 mt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escalación automática (COPC SLA)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Nivel 1 — Supervisor (inmediato)</label>
              <input
                className="w-full mt-1 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                placeholder="+57300..."
                value={escalationConfig.level1_phone}
                onChange={e => setEscalationConfig(p => ({ ...p, level1_phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nivel 2 — Gerente (si persiste &gt;30 min)</label>
              <input
                className="w-full mt-1 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                placeholder="+57300..."
                value={escalationConfig.level2_phone}
                onChange={e => setEscalationConfig(p => ({ ...p, level2_phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nivel 3 — CEO (si persiste &gt;2h, opcional)</label>
              <input
                className="w-full mt-1 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                placeholder="+57300..."
                value={escalationConfig.level3_phone || ''}
                onChange={e => setEscalationConfig(p => ({ ...p, level3_phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Minutos antes de escalar a nivel 2</label>
              <input
                type="number"
                className="w-full mt-1 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
                placeholder="30"
                value={escalationConfig.level2_delay_min}
                onChange={e => setEscalationConfig(p => ({ ...p, level2_delay_min: Number(e.target.value) }))}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Cumple estándar COPC para gestión de excepciones operativas</p>
        </div>

        {addedMsg && (
          <p className="text-xs text-emerald-400 animate-fade-in">{addedMsg}</p>
        )}
      </div>

      {/* Tabs: Activas / Inactivas / Historial */}
      <Tabs defaultValue="active">
        <PageTabsBar>
          <PageTabs
            activeTab={alertTab}
            onChange={setAlertTab}
            tabs={[
              {
                value: 'active',
                label: 'Activas',
                icon: <Bell size={15} />,
                badge: <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">{activeAlerts.length}</span>,
              },
              {
                value: 'fired',
                label: 'Inactivas',
                icon: <BellOff size={15} />,
                badge: <span className="px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-bold">{firedAlerts.length}</span>,
              },
              {
                value: 'history',
                label: 'Historial Supabase',
                icon: <History size={15} />,
                badge: <span className="px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-bold">{alertHistory.length}</span>,
              },
            ]}
          />
        </PageTabsBar>

        <TabsContent value="active" className="mt-4 space-y-3">
          {activeAlerts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-8 text-center">
              <p className="text-muted-foreground text-sm">No hay alertas activas</p>
            </div>
          ) : (
            activeAlerts.map(a => (
              <AlertCard key={a.id} alert={a} onToggle={toggleAlert} />
            ))
          )}
        </TabsContent>

        <TabsContent value="fired" className="mt-4 space-y-3">
          {firedAlerts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-8 text-center">
              <p className="text-muted-foreground text-sm">Sin alertas inactivas</p>
            </div>
          ) : (
            firedAlerts.map(a => (
              <AlertCard key={a.id} alert={a} onToggle={toggleAlert} />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">
              Últimas 10 alertas registradas en Supabase · tabla <code className="bg-secondary px-1 rounded">alert_log</code>
            </p>
            <button
              onClick={loadHistory}
              disabled={historyLoading}
              className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              {historyLoading ? <Loader2 size={11} className="animate-spin" /> : null}
              Actualizar
            </button>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : historyError ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center space-y-2">
              <p className="text-sm text-red-400 font-medium">Error cargando historial</p>
              <p className="text-xs text-muted-foreground">{historyError}</p>
              <p className="text-xs text-muted-foreground">
                La tabla <code>alert_log</code> puede no existir aún. Ejecuta el script SQL en Supabase Dashboard.
              </p>
            </div>
          ) : alertHistory.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-8 text-center space-y-2">
              <History size={28} className="mx-auto text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Sin alertas registradas en Supabase</p>
              <p className="text-xs text-muted-foreground">
                Usa "Evaluar ahora" o "Probar alerta" para generar el primer registro.
              </p>
            </div>
          ) : (
            alertHistory.map((entry, i) => (
              <HistorialCard key={entry.id ?? i} entry={entry} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
