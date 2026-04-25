/**
 * MetricsDisplay - Scale-A
 * Muestra métricas dinámicas según business_type del cliente
 */
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { TrendingUp, TrendingDown, Target, Users } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number;
  benchmark?: number;
  icon?: React.ReactNode;
}

function MetricCard({ label, value, trend, benchmark, icon }: MetricCardProps) {
  const trendIcon = trend && trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  const trendColor = trend && trend > 0 ? 'text-green-500' : 'text-red-500';
  
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          {trendIcon}
          <span>{Math.abs(trend)}% vs periodo anterior</span>
        </div>
      )}
      {benchmark !== undefined && (
        <div className="text-xs text-muted-foreground mt-1">
          Benchmark: {benchmark}%
        </div>
      )}
    </div>
  );
}

interface MetricsDisplayProps {
  data: Record<string, number>;
}

export function MetricsDisplay({ data }: MetricsDisplayProps) {
  const { data: profile } = useBusinessProfile();

  if (!profile) {
    return <div>Cargando perfil...</div>;
  }

  // Mapeo de métricas según business_type
  const metricsConfig: Record<string, Array<{ key: string; label: string; icon: React.ReactNode }>> = {
    collections: [
      { key: 'rpc_rate', label: 'RPC Rate', icon: <Target className="h-4 w-4" /> },
      { key: 'ptp_rate', label: 'Tasa Promesa', icon: <TrendingUp className="h-4 w-4" /> },
      { key: 'recovery_amount', label: 'Recaudo', icon: <Users className="h-4 w-4" /> },
    ],
    service_support: [
      { key: 'fcr', label: 'FCR', icon: <Target className="h-4 w-4" /> },
      { key: 'csat', label: 'CSAT', icon: <TrendingUp className="h-4 w-4" /> },
      { key: 'resolution_time', label: 'Tiempo Resolución', icon: <Users className="h-4 w-4" /> },
    ],
    sales: [
      { key: 'conversion_rate', label: 'Conversión', icon: <Target className="h-4 w-4" /> },
      { key: 'revenue', label: 'Venta', icon: <TrendingUp className="h-4 w-4" /> },
      { key: 'avg_ticket', label: 'Ticket Promedio', icon: <Users className="h-4 w-4" /> },
    ],
    retention: [
      { key: 'retention_rate', label: 'Retención', icon: <Target className="h-4 w-4" /> },
      { key: 'upsell_rate', label: 'Upsell', icon: <TrendingUp className="h-4 w-4" /> },
      { key: 'nps', label: 'NPS', icon: <Users className="h-4 w-4" /> },
    ],
  };

  const metrics = metricsConfig[profile.business_type] || metricsConfig.collections;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {metrics.map(metric => (
        <MetricCard
          key={metric.key}
          label={metric.label}
          value={data[metric.key] || 'N/A'}
          icon={metric.icon}
        />
      ))}
    </div>
  );
}
