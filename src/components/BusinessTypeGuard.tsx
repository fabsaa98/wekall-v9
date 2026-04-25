/**
 * BusinessTypeGuard - Scale-A
 * Componente que muestra advertencia cuando las métricas no coinciden con el negocio
 */
import { AlertTriangle } from 'lucide-react';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';

interface Props {
  children: React.ReactNode;
  requiredTypes?: string[];
  fallback?: React.ReactNode;
}

export function BusinessTypeGuard({ children, requiredTypes, fallback }: Props) {
  const { data: profile, isLoading } = useBusinessProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si no hay restricción o el tipo coincide, mostrar contenido
  if (!requiredTypes || requiredTypes.includes(profile?.business_type || '')) {
    return <>{children}</>;
  }

  // Si no coincide, mostrar fallback o advertencia
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-6 m-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-yellow-500 mb-2">
            Tipo de negocio no compatible
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Esta vista está diseñada para{' '}
            <strong>{requiredTypes?.join(' o ')}</strong>, pero tu negocio es{' '}
            <strong>{profile?.display_name}</strong>.
          </p>
          <p className="text-xs text-muted-foreground">
            Las métricas mostradas pueden no ser relevantes para tu operación.
            Contacta soporte para configurar las vistas adecuadas.
          </p>
        </div>
      </div>
    </div>
  );
}
