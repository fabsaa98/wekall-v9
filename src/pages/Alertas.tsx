import { useState } from 'react';
import { AlertTriangle, Info, XCircle, Plus, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { alertsData as initialAlerts, type Alert } from '@/data/mockData';
import { cn } from '@/lib/utils';

const exampleChips = [
  'CSAT baje de 3.5',
  'Conversión baje de 20%',
  'Escalaciones suban al 15%',
  'AHT supere los 8 min',
  'FCR baje del 70%',
];

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
    classes: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-400',
  },
  info: {
    icon: <Info size={16} />,
    label: 'Info',
    classes: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    dot: 'bg-blue-400',
  },
};

function AlertCard({ alert, onToggle }: { alert: Alert; onToggle: (id: string) => void }) {
  const config = severityConfig[alert.severity];

  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 flex items-start gap-4 transition-all',
      alert.active ? 'border-border' : 'border-border/50 opacity-60',
    )}>
      {/* Severity icon */}
      <div className={cn('p-2 rounded-lg border shrink-0', config.classes)}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{alert.title}</p>
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-semibold border',
                config.classes,
              )}>
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

export default function Alertas() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [nlInput, setNlInput] = useState('');
  const [addedMsg, setAddedMsg] = useState('');

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
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alertas Inteligentes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Monitoreo en tiempo real de tus KPIs · {activeAlerts.length} activas
        </p>
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

        {/* Example chips */}
        <div className="flex flex-wrap gap-2">
          {exampleChips.map(chip => (
            <button
              key={chip}
              onClick={() => setNlInput(chip)}
              className="px-2.5 py-1 rounded-full text-xs border border-primary/20 text-primary hover:bg-primary/10 transition-all"
            >
              {chip}
            </button>
          ))}
        </div>

        {addedMsg && (
          <p className="text-xs text-emerald-400 animate-fade-in">{addedMsg}</p>
        )}
      </div>

      {/* Alerts list */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Activas
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
              {activeAlerts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="fired">
            Disparadas / Inactivas
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-bold">
              {firedAlerts.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {activeAlerts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
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
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground text-sm">Sin alertas disparadas</p>
            </div>
          ) : (
            firedAlerts.map(a => (
              <AlertCard key={a.id} alert={a} onToggle={toggleAlert} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
