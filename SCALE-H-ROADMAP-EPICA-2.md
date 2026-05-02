# Scale-H: Roadmap Épica 2 — Plan de Implementación

**Fecha:** 01 de mayo de 2026, 22:00 COT  
**Solicitado por:** Fabián Saavedra (CEO)  
**Planificado por:** GlorIA AI

---

## 📊 **ESTADO ACTUAL**

**Completado:** 28/101 SP (28%) | 7/13 historias  
**Épica 1:** ✅ 100% (15 SP)  
**Épica 2:** ⏳ 31% (13/42 SP)

---

## 🎯 **HISTORIAS PENDIENTES ÉPICA 2**

### **1. US-EI-009: Benchmark Comparator** — 13 SP (ALTA PRIORIDAD)

**Objetivo:** Extraer benchmarks del documento y compararlos automáticamente con métricas actuales del CDR.

**Implementación técnica:**

#### **Backend (Worker Proxy)**
```typescript
// Agregar función extractBenchmarks() en Worker
async function extractBenchmarks(documentText: string, cdrData: any) {
  const prompt = `
  Del siguiente documento, extrae TODAS las métricas de benchmark mencionadas.
  
  Retorna JSON:
  {
    "benchmarks": [
      {
        "metric": "tasa_contacto",
        "benchmark_value": 60,
        "benchmark_source": "promedio industria LATAM 2024",
        "top_quartile": 75,
        "bottom_quartile": 45,
        "unit": "%"
      }
    ]
  }
  
  Documento:
  ${documentText}
  `;
  
  const response = await callGPT4o(prompt);
  const benchmarks = JSON.parse(response);
  
  // Cruzar con CDR actual
  benchmarks.benchmarks.forEach(b => {
    const currentValue = getCDRMetric(b.metric, cdrData);
    if (currentValue !== null) {
      b.current_value = currentValue;
      b.gap_percent = ((currentValue - b.benchmark_value) / b.benchmark_value) * 100;
      b.position = currentValue > b.benchmark_value ? 'above' : 
                    currentValue < b.benchmark_value ? 'below' : 'inline';
    }
  });
  
  return benchmarks;
}
```

#### **Frontend (Componente BenchmarkCard)**
```tsx
// src/components/BenchmarkCard.tsx
interface BenchmarkCardProps {
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  topQuartile?: number;
  bottomQuartile?: number;
  unit: string;
  source: string;
  gapPercent: number;
  position: 'above' | 'below' | 'inline';
}

export function BenchmarkCard({ metric, currentValue, benchmarkValue, topQuartile, bottomQuartile, unit, source, gapPercent, position }: BenchmarkCardProps) {
  return (
    <div className="benchmark-card border rounded-lg p-4 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm">{metricLabel(metric)}</h4>
        <span className={cn(
          "px-2 py-0.5 rounded text-xs font-bold",
          position === 'above' ? "bg-green-500/10 text-green-600" :
          position === 'below' ? "bg-red-500/10 text-red-600" :
          "bg-gray-500/10 text-gray-600"
        )}>
          {position === 'above' ? '✅ Por encima' :
           position === 'below' ? '⚠️ Por debajo' :
           '➡️ En línea'}
        </span>
      </div>
      
      {/* Gauge visual */}
      <div className="relative h-2 bg-gray-200 rounded-full mb-3">
        {bottomQuartile && (
          <div 
            className="absolute h-full bg-red-200 rounded-l-full"
            style={{ width: `${(bottomQuartile / (topQuartile || 100)) * 100}%` }}
          />
        )}
        <div 
          className="absolute h-full bg-yellow-200"
          style={{ 
            left: `${bottomQuartile ? (bottomQuartile / (topQuartile || 100)) * 100 : 0}%`,
            width: `${benchmarkValue / (topQuartile || 100) * 100}%`
          }}
        />
        {topQuartile && (
          <div 
            className="absolute h-full bg-green-200 rounded-r-full"
            style={{ 
              left: `${(benchmarkValue / (topQuartile || 100)) * 100}%`,
              width: `${((topQuartile - benchmarkValue) / topQuartile) * 100}%`
            }}
          />
        )}
        
        {/* Indicator: current value */}
        <div 
          className="absolute top-0 -mt-1 w-1 h-4 bg-primary rounded"
          style={{ left: `${(currentValue / (topQuartile || 100)) * 100}%` }}
        />
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Tu performance</p>
          <p className="font-bold text-lg">{currentValue}{unit}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Benchmark</p>
          <p className="font-semibold text-lg text-muted-foreground">{benchmarkValue}{unit}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground text-xs">Gap</p>
          <p className={cn(
            "font-bold text-lg",
            gapPercent > 0 ? "text-green-600" : "text-red-600"
          )}>
            {gapPercent > 0 ? '+' : ''}{gapPercent.toFixed(1)}%
          </p>
        </div>
      </div>
      
      {/* Source */}
      <p className="text-[10px] text-muted-foreground mt-2 italic">
        Fuente: {source}
      </p>
      
      {/* Insight */}
      <div className="mt-3 p-2 bg-secondary/50 rounded text-xs">
        {position === 'above' ? (
          <p>✅ Estás <strong>{Math.abs(gapPercent).toFixed(1)}%</strong> por encima del benchmark. {topQuartile && currentValue < topQuartile ? `Oportunidad: alcanzar top quartile (${topQuartile}${unit}) para destacar.` : 'Excelente performance.'}</p>
        ) : position === 'below' ? (
          <p>⚠️ Estás <strong>{Math.abs(gapPercent).toFixed(1)}%</strong> por debajo del benchmark. Gap de <strong>{Math.abs(currentValue - benchmarkValue).toFixed(1)}{unit}</strong>. Prioriza mejoras.</p>
        ) : (
          <p>➡️ Tu performance está en línea con el benchmark de la industria.</p>
        )}
      </div>
    </div>
  );
}

function metricLabel(metric: string): string {
  const labels: Record<string, string> = {
    'tasa_contacto': 'Tasa de Contacto',
    'aht': 'AHT (Tiempo Promedio de Atención)',
    'fcr': 'FCR (First Call Resolution)',
    'csat': 'CSAT (Customer Satisfaction)',
    'nps': 'Net Promoter Score',
    'abandono': 'Tasa de Abandono',
    'conversion': 'Tasa de Conversión',
    'costo_llamada': 'Costo por Llamada',
  };
  return labels[metric] || metric;
}
```

#### **Integración en DocumentAnalysis.tsx**
```tsx
// Después de analyzeWithVicky()
const benchmarks = await extractBenchmarks(extractedText, cdrData);

// Al guardar en Supabase
await saveExecutiveInsight({
  ...params,
  benchmarks: { metrics: benchmarks.benchmarks }
});

// Al renderizar análisis
{doc.benchmarks && doc.benchmarks.metrics.length > 0 && (
  <div className="mt-6">
    <h3 className="text-lg font-semibold mb-3">📊 Comparación vs Benchmarks</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {doc.benchmarks.metrics.map((bm, i) => (
        <BenchmarkCard key={i} {...bm} />
      ))}
    </div>
  </div>
)}
```

**Tiempo estimado:** 4-5 horas  
**Valor:** ALTO — comparación automática vs industria en cada análisis

---

### **2. US-EI-008: Página Historial Completo** — 8 SP (ajustado, original 13)

**Objetivo:** Página dedicada `/executive-insights/history` con tabla completa, filtros avanzados, búsqueda.

**Ya tenemos:**
- ✅ Historial en sidebar (agrupado por fechas)
- ✅ Filtros por tipo
- ✅ Badges de estado

**Falta:**
- ⏳ Ruta `/executive-insights/history`
- ⏳ Tabla completa (no cards)
- ⏳ Búsqueda por nombre de archivo
- ⏳ Filtros por fecha (últimos 7 días, 30 días, custom)
- ⏳ Paginación (20 items/página)
- ⏳ Export CSV

**Implementación:**

```tsx
// src/pages/ExecutiveInsightsHistory.tsx
import { useState, useEffect } from 'react';
import { useClient } from '@/contexts/ClientContext';
import { getExecutiveInsights } from '@/lib/executiveInsights';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, Search, Eye, Trash2 } from 'lucide-react';

export function ExecutiveInsightsHistory() {
  const { currentClient } = useClient();
  const [insights, setInsights] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | '7d' | '30d' | 'custom'
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  
  useEffect(() => {
    if (currentClient) {
      getExecutiveInsights(currentClient.client_id).then(setInsights);
    }
  }, [currentClient]);
  
  // Filtrado
  const filtered = insights.filter(doc => {
    // Búsqueda
    if (searchQuery && !doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Fecha
    if (dateFilter === '7d') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (new Date(doc.created_at) < weekAgo) return false;
    } else if (dateFilter === '30d') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      if (new Date(doc.created_at) < monthAgo) return false;
    }
    
    return true;
  });
  
  // Paginación
  const paginatedData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  
  // Export CSV
  const exportCSV = () => {
    const csv = [
      ['Fecha', 'Archivo', 'Tipo', 'Estado', 'Brief'].join(','),
      ...filtered.map(doc => [
        new Date(doc.created_at).toLocaleDateString(),
        doc.file_name,
        doc.file_type,
        doc.analysis.startsWith('❌') ? 'Rechazado' : 'Aprobado',
        `"${doc.executive_brief?.replace(/"/g, '""') || ''}"` // Escape quotes
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executive-insights-${currentClient.client_id}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Executive Insights — Historial</h1>
        <Button onClick={exportCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de archivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="all">Todas las fechas</option>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
        </select>
      </div>
      
      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Executive Brief</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium">{doc.file_name}</TableCell>
              <TableCell>{doc.file_type}</TableCell>
              <TableCell>
                <span className={cn(
                  "px-2 py-1 rounded text-xs font-bold",
                  doc.analysis.startsWith('❌') 
                    ? "bg-red-500/10 text-red-600" 
                    : "bg-green-500/10 text-green-600"
                )}>
                  {doc.analysis.startsWith('❌') ? 'Rechazado' : 'Aprobado'}
                </span>
              </TableCell>
              <TableCell className="max-w-md">
                <details className="cursor-pointer">
                  <summary className="text-xs text-muted-foreground hover:text-foreground">
                    Ver brief...
                  </summary>
                  <p className="text-xs mt-2">{doc.executive_brief}</p>
                </details>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Mostrando {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
        </p>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Anterior
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Agregar ruta en App.tsx:**
```tsx
<Route path="/executive-insights/history" element={<ExecutiveInsightsHistory />} />
```

**Tiempo estimado:** 2-3 horas  
**Valor:** MEDIO — útil para auditoría, pero sidebar ya cubre uso común

---

### **3. US-EI-011: Export to PDF** — 5 SP

**Objetivo:** Exportar análisis completo + brief + benchmarks a PDF profesional.

**Stack:** `jspdf` + `jspdf-autotable`

```tsx
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function exportToPDF(doc: ProcessedDoc, clientName: string) {
  const pdf = new jsPDF();
  
  // Header
  pdf.setFontSize(20);
  pdf.text('Executive Insights', 20, 20);
  pdf.setFontSize(10);
  pdf.text(clientName, 20, 28);
  pdf.text(new Date().toLocaleDateString(), 20, 33);
  
  // Document info
  pdf.setFontSize(12);
  pdf.text(`Documento: ${doc.fileName}`, 20, 45);
  pdf.text(`Tipo: ${doc.fileType}`, 20, 52);
  
  // Executive Brief
  pdf.setFontSize(14);
  pdf.text('Executive Brief', 20, 65);
  pdf.setFontSize(10);
  const briefLines = pdf.splitTextToSize(doc.executiveBrief || '', 170);
  pdf.text(briefLines, 20, 72);
  
  // Full Analysis
  const yAfterBrief = 72 + (briefLines.length * 5) + 10;
  pdf.setFontSize(14);
  pdf.text('Análisis Completo', 20, yAfterBrief);
  pdf.setFontSize(10);
  const analysisLines = pdf.splitTextToSize(doc.analysis, 170);
  pdf.text(analysisLines, 20, yAfterBrief + 7);
  
  // Benchmarks table (if exist)
  if (doc.benchmarks && doc.benchmarks.length > 0) {
    const yAfterAnalysis = yAfterBrief + 7 + (analysisLines.length * 5) + 10;
    pdf.setFontSize(14);
    pdf.text('Comparación vs Benchmarks', 20, yAfterAnalysis);
    
    const tableData = doc.benchmarks.map(bm => [
      metricLabel(bm.metric),
      `${bm.current_value}${bm.unit}`,
      `${bm.benchmark_value}${bm.unit}`,
      `${bm.gap_percent > 0 ? '+' : ''}${bm.gap_percent.toFixed(1)}%`
    ]);
    
    pdf.autoTable({
      startY: yAfterAnalysis + 5,
      head: [['Métrica', 'Tu Performance', 'Benchmark', 'Gap']],
      body: tableData,
    });
  }
  
  // Footer
  pdf.setFontSize(8);
  pdf.text('Generado por WeKall Intelligence', 20, 285);
  
  // Save
  pdf.save(`executive-insight-${doc.fileName}.pdf`);
}
```

**Botón en UI:**
```tsx
<Button onClick={() => exportToPDF(selectedDoc, currentClient.client_name)}>
  <Download className="mr-2 h-4 w-4" />
  Exportar PDF
</Button>
```

**Tiempo estimado:** 1-2 horas  
**Valor:** MEDIO — útil para compartir con board, pero copy + paste del brief cubre el 80%

---

### **4. US-EI-012: Share Link** — 3 SP

**Objetivo:** Generar URL pública para compartir análisis sin login.

**Implementación:**

```tsx
// Backend: Cloudflare Pages Function
// /functions/api/share/[id].ts
export async function onRequest(context) {
  const { id } = context.params;
  
  const { data, error } = await supabase
    .from('executive_insights')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) {
    return new Response('Not found', { status: 404 });
  }
  
  // HTML simple con análisis
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Executive Insight — ${data.file_name}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; }
        .brief { background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .analysis { line-height: 1.6; }
      </style>
    </head>
    <body>
      <h1>Executive Insight</h1>
      <p><strong>Documento:</strong> ${data.file_name}</p>
      <p><strong>Fecha:</strong> ${new Date(data.created_at).toLocaleDateString()}</p>
      
      <div class="brief">
        <h2>Executive Brief</h2>
        <p>${data.executive_brief}</p>
      </div>
      
      <div class="analysis">
        <h2>Análisis Completo</h2>
        <p>${data.analysis.replace(/\n/g, '<br>')}</p>
      </div>
      
      <footer style="margin-top: 40px; color: #666; font-size: 12px;">
        Generado por WeKall Intelligence
      </footer>
    </body>
    </html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
```

```tsx
// Frontend: botón "Compartir"
async function shareAnalysis(docId: string) {
  const shareUrl = `${window.location.origin}/api/share/${docId}`;
  
  // Copy to clipboard
  await navigator.clipboard.writeText(shareUrl);
  
  toast({
    title: 'Link copiado',
    description: 'Puedes compartir este análisis con cualquiera',
  });
}

<Button onClick={() => shareAnalysis(selectedDoc.id)}>
  <Share className="mr-2 h-4 w-4" />
  Compartir
</Button>
```

**Tiempo estimado:** 1 hora  
**Valor:** BAJO — uso esperado muy limitado (CEO suele compartir brief copy-paste)

---

### **5. US-EI-013: Comentarios** — 3 SP

**Objetivo:** Agregar notas/comentarios a documentos analizados.

**Schema:**
```sql
ALTER TABLE public.executive_insights
ADD COLUMN IF NOT EXISTS comments JSONB;

-- Estructura:
-- {
--   "notes": [
--     {
--       "author": "CEO",
--       "text": "Implementar esto en Q3 2026",
--       "created_at": "2026-05-01T10:00:00Z"
--     }
--   ]
-- }
```

```tsx
// Componente simple
function CommentSection({ docId, comments, onAddComment }) {
  const [newComment, setNewComment] = useState('');
  
  const handleSubmit = async () => {
    await onAddComment(docId, newComment);
    setNewComment('');
  };
  
  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="font-semibold mb-3">Notas</h3>
      
      {comments?.notes?.map((note, i) => (
        <div key={i} className="mb-3 p-3 bg-secondary rounded">
          <p className="text-sm">{note.text}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {note.author} • {new Date(note.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
      
      <div className="flex gap-2 mt-3">
        <Input
          placeholder="Agregar nota..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <Button size="sm" onClick={handleSubmit}>
          Agregar
        </Button>
      </div>
    </div>
  );
}
```

**Tiempo estimado:** 1 hora  
**Valor:** BAJO — nice-to-have, no crítico

---

## 📊 **RESUMEN ROADMAP**

| ID | Historia | SP | Tiempo | Prioridad | Valor |
|----|----------|----|----|-------|-------|
| US-EI-009 | Benchmark Comparator | 13 | 4-5h | ⭐⭐⭐ ALTA | ALTO |
| US-EI-008 | Página Historial | 8 | 2-3h | ⭐⭐ MEDIA | MEDIO |
| US-EI-011 | Export PDF | 5 | 1-2h | ⭐⭐ MEDIA | MEDIO |
| US-EI-012 | Share Link | 3 | 1h | ⭐ BAJA | BAJO |
| US-EI-013 | Comentarios | 3 | 1h | ⭐ BAJA | BAJO |

**Total Épica 2 restante:** 32 SP = ~10-12 horas

---

## 🎯 **RECOMENDACIÓN FINAL**

### **Opción A: Solo lo crítico** ✅ RECOMENDADO
Implementar **solo US-EI-009 (Benchmark Comparator)**
- 13 SP = 4-5 horas
- Máximo valor agregado
- Diferenciador clave vs competencia
- **Progreso final:** 41/101 SP (41%)

### **Opción B: Completar Épica 2**
Implementar las 5 historias
- 32 SP = 10-12 horas
- Funcionalidad completa
- Features nice-to-have de bajo uso
- **Progreso final:** 60/101 SP (59%)

### **Opción C: Parar aquí (MVP actual)**
No implementar nada más de Épica 2
- 0 SP adicionales
- MVP ya cubre 80% del valor
- **Progreso final:** 28/101 SP (28%) ← ACTUAL

---

## 💡 **DECISIÓN SUGERIDA**

**Opción A: Solo Benchmark Comparator**

**Razón:**
- ✅ Feature diferenciador (nadie más lo tiene)
- ✅ Alto valor para CEO (comparación automática vs industria)
- ✅ Tiempo razonable (4-5 horas vs 10-12 horas para todo)
- ✅ Completa el valor core de Executive Insights
- ❌ Las otras 4 historias son nice-to-have pero ROI bajo

**Siguiente prioridad después:** Scale-A P1 Frontend (recaudo real en dashboard)

---

**Última actualización:** 01 mayo 2026, 22:00 COT  
**Status:** ROADMAP LISTO PARA EJECUCIÓN
