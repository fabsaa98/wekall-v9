/**
 * ChannelCostComparison.tsx
 * Scale-A P2: Dashboard de Costo por Canal (Vicky IA vs Agente Humano)
 * 12 mayo 2026
 */

import { useMemo } from 'react';
import { DollarSign, TrendingDown, Clock, Users, Bot, Phone, MessageSquare, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useChannelCosts } from '@/hooks/useChannelCosts';
import { useClient } from '@/contexts/ClientContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

const CHANNEL_ICONS: Record<string, JSX.Element> = {
  voz: <Phone size={16} />,
  vicky: <Bot size={16} />,
  whatsapp: <MessageSquare size={16} />,
  email: <Mail size={16} />,
  chat: <MessageSquare size={16} />,
};

const CHANNEL_LABELS: Record<string, string> = {
  voz: 'Agente Humano (Voz)',
  vicky: 'Vicky IA',
  whatsapp: 'WhatsApp Bot',
  email: 'Email Automatizado',
  chat: 'Chat Bot',
};

const COLORS = {
  humano: '#ef4444', // red-500
  vicky: '#10b981',  // green-500
  otros: '#3b82f6',  // blue-500
};

export default function ChannelCostComparison() {
  const { currentClient } = useClient();
  const { data, loading, error } = useChannelCosts(currentClient?.client_id || '');

  // Formatear datos para gráfico de barras
  const chartData = useMemo(() => {
    if (!data?.canales) return [];
    
    return data.canales.map(c => ({
      channel: CHANNEL_LABELS[c.channel] || c.channel,
      costo: c.costo,
      tiempo: Math.round(c.tiempo_seg / 60), // convertir a minutos
      channelKey: c.channel,
    }));
  }, [data]);

  // Métricas principales
  const metrics = useMemo(() => {
    if (!data) return null;

    const totalInteracciones = data.volumen_humano + data.volumen_vicky;
    const costoPromedioActual = totalInteracciones > 0
      ? ((data.volumen_humano * data.costo_humano) + (data.volumen_vicky * data.costo_vicky)) / totalInteracciones
      : 0;
    
    const ahorroMensual = data.volumen_vicky * (data.costo_humano - data.costo_vicky);

    return {
      ahorroPorInteraccion: data.costo_humano - data.costo_vicky,
      ahorroPct: data.ahorro_pct,
      ahorroMensual,
      costoPromedioActual,
      penetracionIA: totalInteracciones > 0 ? (data.volumen_vicky / totalInteracciones) * 100 : 0,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando análisis de costos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-red-600">Error al cargar datos</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!data || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card>
          <CardHeader>
            <CardTitle>Sin datos disponibles</CardTitle>
            <CardDescription>
              No se encontraron costos configurados para {currentClient?.client_name || 'este cliente'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Costo por Canal</h1>
        <p className="text-muted-foreground">
          Comparativa de costos operativos: IA vs Agente Humano
        </p>
        <Badge variant="outline" className="mt-2">
          Scale-A P2 · {currentClient?.client_name}
        </Badge>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ahorro por interacción */}
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown size={16} className="text-green-600" />
              Ahorro por Interacción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${metrics.ahorroPorInteraccion.toLocaleString('es-CO')} COP
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.ahorroPct.toFixed(1)}% de reducción
            </p>
          </CardContent>
        </Card>

        {/* Ahorro mensual */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign size={16} />
              Ahorro Mensual Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(metrics.ahorroMensual / 1_000_000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Basado en {data.volumen_vicky.toLocaleString()} interacciones IA
            </p>
          </CardContent>
        </Card>

        {/* Penetración IA */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot size={16} />
              Penetración IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.penetracionIA.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.volumen_vicky.toLocaleString()} de {(data.volumen_vicky + data.volumen_humano).toLocaleString()} interacciones
            </p>
          </CardContent>
        </Card>

        {/* Costo promedio actual */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign size={16} />
              Costo Promedio Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(metrics.costoPromedioActual).toLocaleString('es-CO')} COP
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Por interacción (mix actual)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comparativa principal: Vicky vs Humano */}
      <Card>
        <CardHeader>
          <CardTitle>Vicky IA vs Agente Humano</CardTitle>
          <CardDescription>
            Comparativa de costo y volumen últimos 30 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Agente Humano */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone size={20} className="text-red-500" />
                <h3 className="font-semibold">Agente Humano (Voz)</h3>
              </div>
              <div className="space-y-2 pl-7">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Costo por interacción</span>
                  <span className="font-mono font-semibold">${data.costo_humano.toLocaleString('es-CO')} COP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Volumen (30d)</span>
                  <span className="font-mono">{data.volumen_humano.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Costo total</span>
                  <span className="font-mono">${((data.costo_humano * data.volumen_humano) / 1_000_000).toFixed(1)}M</span>
                </div>
              </div>
            </div>

            {/* Vicky IA */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-green-500" />
                <h3 className="font-semibold">Vicky IA</h3>
              </div>
              <div className="space-y-2 pl-7">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Costo por interacción</span>
                  <span className="font-mono font-semibold text-green-600">${data.costo_vicky.toLocaleString('es-CO')} COP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Volumen (30d)</span>
                  <span className="font-mono">{data.volumen_vicky.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Costo total</span>
                  <span className="font-mono text-green-600">${((data.costo_vicky * data.volumen_vicky) / 1_000_000).toFixed(1)}M</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de comparación visual */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ahorro por interacción</span>
              <span className="font-semibold text-green-600">
                ${metrics.ahorroPorInteraccion.toLocaleString('es-CO')} COP ({metrics.ahorroPct.toFixed(1)}%)
              </span>
            </div>
            <div className="h-8 rounded-lg overflow-hidden flex">
              <div 
                className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: '100%' }}
              >
                Humano: ${data.costo_humano}
              </div>
            </div>
            <div className="h-8 rounded-lg overflow-hidden flex">
              <div 
                className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${(data.costo_vicky / data.costo_humano) * 100}%` }}
              >
                Vicky: ${data.costo_vicky}
              </div>
              <div className="bg-green-500/20 flex-1"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de todos los canales */}
      <Card>
        <CardHeader>
          <CardTitle>Costo por Canal</CardTitle>
          <CardDescription>
            Comparativa de todos los canales disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="channel" 
                className="text-xs"
                angle={-15}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                label={{ value: 'Costo COP', angle: -90, position: 'insideLeft' }}
                className="text-xs"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'costo') return [`$${value.toLocaleString('es-CO')} COP`, 'Costo'];
                  if (name === 'tiempo') return [`${value} min`, 'Tiempo promedio'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="costo" name="Costo por interacción" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.channelKey === 'vicky' ? COLORS.vicky :
                      entry.channelKey === 'voz' ? COLORS.humano :
                      COLORS.otros
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Tabla de detalles */}
          <div className="mt-6">
            <h4 className="font-semibold mb-3 text-sm">Detalle por canal</h4>
            <div className="space-y-2">
              {chartData.map((item) => (
                <div 
                  key={item.channelKey}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                      {CHANNEL_ICONS[item.channelKey]}
                    </div>
                    <span className="font-medium">{item.channel}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-muted-foreground" />
                      <span className="font-mono">${item.costo.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-muted-foreground" />
                      <span className="font-mono">{item.tiempo} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proyección de ahorro */}
      <Card className="border-violet-500/20 bg-violet-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown size={20} className="text-violet-600" />
            Potencial de Ahorro
          </CardTitle>
          <CardDescription>
            Proyección si se automatiza 100% con Vicky IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Ahorro mensual potencial</div>
              <div className="text-2xl font-bold text-violet-600">
                ${(((data.volumen_humano + data.volumen_vicky) * (data.costo_humano - data.costo_vicky)) / 1_000_000).toFixed(1)}M COP
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Ahorro anual potencial</div>
              <div className="text-2xl font-bold text-violet-600">
                ${(((data.volumen_humano + data.volumen_vicky) * (data.costo_humano - data.costo_vicky) * 12) / 1_000_000).toFixed(1)}M COP
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">ROI automatización</div>
              <div className="text-2xl font-bold text-violet-600">
                {metrics.ahorroPct.toFixed(1)}%
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            * Proyección basada en volumen actual de {(data.volumen_humano + data.volumen_vicky).toLocaleString()} interacciones mensuales
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
