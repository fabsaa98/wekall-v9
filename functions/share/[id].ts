// Scale-H US-EI-012: Share Link
// Public share endpoint for Executive Insights
// 01 de mayo de 2026

import { createClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

export async function onRequest(context: { env: Env; params: { id: string } }) {
  const { id } = context.params;
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = context.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response('Service not configured', { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('executive_insights')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return new Response(
      `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Insight - No encontrado</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 80px auto; padding: 20px; text-align: center; }
    h1 { color: #dc2626; }
  </style>
</head>
<body>
  <h1>📄 Análisis no encontrado</h1>
  <p>Este análisis no existe o fue eliminado.</p>
</body>
</html>
      `,
      {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  // Render HTML
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Insight — ${data.file_name}</title>
  <meta name="description" content="Análisis ejecutivo generado por WeKall Intelligence">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 14px;
      opacity: 0.9;
    }
    .meta {
      background: #f9fafb;
      padding: 20px 40px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      font-size: 14px;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .meta-item strong {
      color: #6b7280;
      font-weight: 600;
    }
    .content {
      padding: 40px;
    }
    .brief {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid #f59e0b;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 32px;
    }
    .brief h2 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #92400e;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brief p {
      font-size: 15px;
      line-height: 1.7;
      color: #78350f;
    }
    .analysis {
      margin-bottom: 32px;
    }
    .analysis h2 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #111827;
    }
    .analysis-text {
      font-size: 15px;
      line-height: 1.8;
      white-space: pre-wrap;
      color: #374151;
    }
    .benchmarks {
      margin-bottom: 32px;
    }
    .benchmarks h2 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #111827;
    }
    .benchmark-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    .benchmark-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      background: #f9fafb;
    }
    .benchmark-card h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #374151;
    }
    .benchmark-stat {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .benchmark-stat strong {
      color: #6b7280;
    }
    .footer {
      background: #f9fafb;
      padding: 24px 40px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 13px;
      color: #6b7280;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
    @media (max-width: 640px) {
      .header { padding: 24px; }
      .header h1 { font-size: 22px; }
      .content { padding: 24px; }
      .meta { padding: 16px 24px; }
      .footer { padding: 20px 24px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Executive Insight</h1>
      <p>WeKall Intelligence — Análisis Estratégico</p>
    </div>
    
    <div class="meta">
      <div class="meta-item">
        <strong>📄 Documento:</strong>
        <span>${data.file_name}</span>
      </div>
      <div class="meta-item">
        <strong>📅 Fecha:</strong>
        <span>${new Date(data.created_at).toLocaleDateString('es-CO', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</span>
      </div>
      <div class="meta-item">
        <strong>📁 Tipo:</strong>
        <span>${data.file_type.toUpperCase()}</span>
      </div>
    </div>
    
    <div class="content">
      ${data.executive_brief ? `
      <div class="brief">
        <h2>💡 Executive Brief</h2>
        <p>${data.executive_brief}</p>
      </div>
      ` : ''}
      
      <div class="analysis">
        <h2>📝 Análisis Completo</h2>
        <div class="analysis-text">${data.analysis.replace(/\n/g, '<br>')}</div>
      </div>
      
      ${data.benchmarks && data.benchmarks.metrics && data.benchmarks.metrics.length > 0 ? `
      <div class="benchmarks">
        <h2>📊 Comparación vs Benchmarks</h2>
        <div class="benchmark-grid">
          ${data.benchmarks.metrics.map((bm: any) => `
          <div class="benchmark-card">
            <h3>${getMetricLabel(bm.metric)}</h3>
            ${bm.current_value !== undefined ? `
            <div class="benchmark-stat">
              <strong>Tu performance:</strong>
              <span>${bm.current_value.toFixed(1)}${bm.unit}</span>
            </div>
            ` : ''}
            <div class="benchmark-stat">
              <strong>Benchmark:</strong>
              <span>${bm.benchmark_value.toFixed(1)}${bm.unit}</span>
            </div>
            ${bm.gap_percent !== undefined ? `
            <div class="benchmark-stat">
              <strong>Gap:</strong>
              <span style="color: ${bm.gap_percent > 0 ? '#059669' : '#dc2626'}; font-weight: 600;">
                ${bm.gap_percent > 0 ? '+' : ''}${bm.gap_percent.toFixed(1)}%
              </span>
            </div>
            ` : ''}
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>
        Generado por <a href="https://wekall-intelligence.pages.dev" target="_blank">WeKall Intelligence</a>
      </p>
      <p style="margin-top: 8px; font-size: 12px;">
        Este análisis es confidencial y está destinado solo para uso ejecutivo.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function getMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    tasa_contacto: 'Tasa de Contacto',
    aht: 'AHT (Tiempo Promedio)',
    fcr: 'FCR (First Call Resolution)',
    csat: 'CSAT (Satisfacción)',
    nps: 'Net Promoter Score',
    abandono: 'Tasa de Abandono',
    conversion: 'Tasa de Conversión',
    tasa_promesa: 'Tasa de Promesa de Pago',
    costo_llamada: 'Costo por Llamada',
    tco: 'TCO',
    productividad: 'Productividad',
    utilizacion: 'Utilización',
  };
  return labels[metric] || metric.replace(/_/g, ' ').toUpperCase();
}
