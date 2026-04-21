/**
 * AlertsView — DECISIÓN FIX 2E (V20): NO enrutado en App.tsx.
 * Redundante con /alertas (Alertas.tsx), que ya tiene: alertas dinámicas desde CDR Supabase,
 * historial en alert_log, creación NL, evaluación de KPIs y umbrales dinámicos por cliente.
 * AlertsView usa mockAlertRules/mockAlerts que no existen en mockData.ts actual.
 */
import { useState } from 'react';
import { Bell, Plus, Lightning, Warning, Info, EnvelopeSimple, SlackLogo, Globe, Clock } from '@phosphor-icons/react';
import { useAlerts, useAlertRules } from '@/hooks/useAlerts';
import { mockAlertRules, mockAlerts } from '@/data/mockData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const severityConfig = {
  critical: { label: 'Crítica', classes: 'bg-wk-red/10 text-wk-red', icon: Lightning },
  warning: { label: 'Advertencia', classes: 'bg-orange-500/10 text-orange-400', icon: Warning },
  info: { label: 'Informativa', classes: 'bg-wk-blue/10 text-wk-blue', icon: Info },
};

const channelIcons = { email: EnvelopeSimple, slack: SlackLogo, webhook: Globe };

export default function AlertsView() {
  const [tab, setTab] = useState<'rules' | 'recent'>('rules');

  const { data: alertRulesData, isLoading: loadingRules } = useAlertRules();
  const { data: alertsData, isLoading: loadingAlerts } = useAlerts();

  const alertRules = alertRulesData ?? mockAlertRules;
  const alerts = alertsData ?? mockAlerts;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-secondary p-1 w-fit">
        <button onClick={() => setTab('rules')} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === 'rules' ? 'bg-card text-card-foreground shadow-wk-xs' : 'text-muted-foreground'}`}>
          Reglas de alerta
        </button>
        <button onClick={() => setTab('recent')} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === 'recent' ? 'bg-card text-card-foreground shadow-wk-xs' : 'text-muted-foreground'}`}>
          Alertas recientes
        </button>
      </div>

      {tab === 'rules' && (
        <div className="space-y-3">
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-wk-violet-dark transition-colors">
            <Plus size={16} weight="light" /> Nueva regla
          </button>
          {loadingRules ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4 h-20 animate-pulse" />
              ))}
            </div>
          ) : (
            alertRules.map(rule => {
              const sev = severityConfig[rule.severity];
              return (
                <div key={rule.id} className="rounded-lg border border-border bg-card p-4 shadow-wk-xs transition-shadow hover:shadow-wk-md">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{rule.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rule.conditions.map((c, i) => `${i > 0 ? ` ${c.logic} ` : ''}${c.field} ${c.operator} "${c.value}"`).join('')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sev.classes}`}>{sev.label}</span>
                      <div className={`relative h-5 w-9 rounded-full transition-colors ${rule.active ? 'bg-wk-green' : 'bg-wk-gray-medium'}`}>
                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-wk-xs transition-transform ${rule.active ? 'left-[18px]' : 'left-0.5'}`} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {rule.channels.map(ch => {
                        const Icon = channelIcons[ch];
                        return <Icon key={ch} size={12} weight="light" />;
                      })}
                    </span>
                    <span>Disparada {rule.triggerCount} veces</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'recent' && (
        <div className="space-y-3">
          {loadingAlerts ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4 h-16 animate-pulse" />
              ))}
            </div>
          ) : (
            alerts.map(alert => {
              const sev = severityConfig[alert.severity];
              const SevIcon = sev.icon;
              return (
                <div key={alert.id} className="flex gap-3 rounded-lg border border-border bg-card p-4 shadow-wk-xs">
                  <div className={`mt-0.5 shrink-0 rounded-full p-1.5 ${sev.classes}`}>
                    <SevIcon size={16} weight="light" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-card-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Regla: {alert.ruleName}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <Link to={`/transcriptions/${alert.transcriptionId}`} className="text-wk-blue hover:underline">
                        Ver llamada
                      </Link>
                      <span className="flex items-center gap-1"><Clock size={10} />{format(new Date(alert.sentAt), "d MMM, HH:mm", { locale: es })}</span>
                      <span className="capitalize">{alert.channel}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
