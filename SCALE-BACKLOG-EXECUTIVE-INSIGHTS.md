# 📋 Scale Backlog — Executive Insights Module

**Fecha:** 01 de mayo de 2026  
**Decisión:** Opción A — 2 módulos separados (Vicky Chat + Executive Insights)  
**Status:** Backlog — NO ejecutar ahora

---

## 🎯 **CONTEXTO**

**Decisión estratégica:**
- Mantener "Vicky Chat" (conversacional, queries ad-hoc)
- Crear "Executive Insights" (documental, análisis estratégico)
- **2 módulos separados** (no tabs en uno solo)

**Razones:**
- Flujos de trabajo muy diferentes
- UX optimizada para cada caso
- Escalabilidad futura (permisos granulares, nuevas funcionalidades)
- Precedente de mercado (Slack, Notion, Salesforce)

---

## 📚 **ÉPICAS**

### **Épica 1: Executive Insights — Core Module**
Crear módulo completo de análisis de documentos estratégicos para C-suite

### **Épica 2: Executive Insights — Advanced Features**
Benchmark comparator, decision log, y analytics

### **Épica 3: Executive Insights — Integration & Automation**
API, auto-classification, batch processing

---

## 📝 **HISTORIAS DE USUARIO — ÉPICA 1 (Core Module)**

---

### **US-EI-001: Renaming — "Subir y Analizar" → "Executive Insights"**

**Como:** CEO  
**Quiero:** Que el módulo se llame "Executive Insights"  
**Para:** Entender claramente que es para análisis estratégico ejecutivo, no procesamiento operativo de documentos

**Criterios de aceptación:**
- [ ] Sidebar muestra "Executive Insights" (con icono 📊 o 🎯)
- [ ] Breadcrumb actualizado
- [ ] Meta tags (title, description) actualizados
- [ ] Copy en toda la UI refleja enfoque ejecutivo/estratégico
- [ ] NO menciona "subir", "cargar", "procesar" → SÍ menciona "insights", "decisiones", "estrategia"

**Archivos afectados:**
- `src/components/AppSidebar.tsx`
- `src/pages/DocumentAnalysis.tsx` (renombrar a `ExecutiveInsights.tsx`)
- `src/App.tsx` (rutas)
- Meta tags en `index.html`

**Estimación:** 2 story points (1-2 horas)  
**Prioridad:** Alta  
**Dependencias:** Ninguna

---

### **US-EI-002: Landing Page — Value Proposition Ejecutiva**

**Como:** CEO  
**Quiero:** Ver una landing page clara al entrar a Executive Insights  
**Para:** Entender inmediatamente qué documentos puedo analizar y qué valor obtendré

**Criterios de aceptación:**
- [ ] Hero section con título: "Executive Insights"
- [ ] Subtítulo: "Sube documentos estratégicos. Vicky cruza con tus datos del CDR y genera insights accionables para decisiones de negocio."
- [ ] Sección "Documentos que puedes analizar" con 8 categorías:
  - 📊 Frameworks (SWOT, Canvas, OKRs)
  - 📈 Benchmarks (Gartner, Forrester, McKinsey)
  - 💰 Financieros (P&L, ROI, presupuestos)
  - 🔍 Mercado (competencia, tendencias)
  - 📑 Contratos (SLAs, acuerdos clave)
  - 🎯 Estrategias (go-to-market, roadmaps)
  - ✨ Best Practices (case studies, white papers)
  - 🎤 Transcripciones (keynotes, webinars ejecutivos)
- [ ] Iconos visuales por categoría
- [ ] CTA principal: "Subir primer documento"
- [ ] Diseño limpio, ejecutivo (no operativo)

**Mockup:**
```tsx
<div className="executive-insights-landing">
  <div className="hero">
    <Brain size={48} className="text-primary" />
    <h1>Executive Insights</h1>
    <p className="subtitle">
      Sube documentos estratégicos. Vicky cruza con tus datos del CDR
      y genera insights accionables para decisiones de negocio.
    </p>
  </div>

  <div className="value-props">
    <div className="prop">
      <TrendingUp />
      <h3>Compara vs Benchmarks</h3>
      <p>Identifica gaps y oportunidades vs industria</p>
    </div>
    <div className="prop">
      <Lightbulb />
      <h3>Insights Accionables</h3>
      <p>Recomendaciones concretas, no solo data</p>
    </div>
    <div className="prop">
      <Target />
      <h3>ROI Estimado</h3>
      <p>Impacto financiero proyectado</p>
    </div>
  </div>

  <div className="document-types">
    <h2>Documentos que puedes analizar:</h2>
    <div className="grid grid-cols-4 gap-4">
      {documentTypes.map(type => (
        <div className="doc-type-card">
          <span className="icon">{type.icon}</span>
          <h4>{type.label}</h4>
          <p className="examples">{type.examples}</p>
        </div>
      ))}
    </div>
  </div>

  <div className="cta">
    <button className="upload-btn">
      <Upload size={20} />
      Subir primer documento
    </button>
  </div>
</div>
```

**Estimación:** 5 story points (4-6 horas)  
**Prioridad:** Alta  
**Dependencias:** US-EI-001 (renaming)

---

### **US-EI-003: Validación de Relevancia — Prompt Mejorado**

**Como:** CEO  
**Quiero:** Que Vicky rechace documentos irrelevantes (ej: exámenes médicos)  
**Para:** No perder tiempo analizando contenido que no tiene relación con mi negocio

**Criterios de aceptación:**
- [ ] Prompt de Vicky incluye validación de relevancia ANTES de analizar
- [ ] Categorías aceptadas documentadas:
  - ✅ Frameworks estratégicos
  - ✅ Benchmarks de industria
  - ✅ Informes financieros
  - ✅ Estudios de mercado
  - ✅ Contratos clave
  - ✅ Estrategias comerciales
  - ✅ Best practices
  - ✅ Transcripciones ejecutivas
- [ ] Categorías rechazadas documentadas:
  - ❌ Exámenes médicos
  - ❌ Recetas
  - ❌ Facturas personales
  - ❌ Trámites legales personales
  - ❌ Contenido de entretenimiento
- [ ] Mensaje de rechazo claro y educativo:
  ```
  ❌ Este documento no tiene relación con la operación del contact center
  ni con el negocio de {clientName}.

  Executive Insights analiza documentos estratégicos como:
  • Frameworks (SWOT, OKRs, business cases)
  • Benchmarks e industria (Gartner, best practices)
  • Informes financieros (P&L, ROI)
  • Estrategias comerciales
  ...

  Por favor, sube un documento relacionado con tu operación.
  ```
- [ ] Variable `{clientName}` dinámica (no hardcodeada a "WeKall")

**Archivos afectados:**
- `src/pages/ExecutiveInsights.tsx` (prompt de Vicky)

**Estimación:** 3 story points (2-3 horas)  
**Prioridad:** Alta  
**Dependencias:** US-EI-001

---

### **US-EI-004: Executive Brief Automático (100 palabras)**

**Como:** CEO  
**Quiero:** Que Vicky genere un resumen ejecutivo de 100 palabras por cada documento  
**Para:** Leer rápidamente el hallazgo clave sin revisar el análisis completo

**Criterios de aceptación:**
- [ ] Prompt adicional a Vicky después del análisis:
  ```
  Genera un EXECUTIVE BRIEF de máximo 100 palabras que responda:
  1. ¿Qué documento se analizó? (tipo, fuente, fecha si aplica)
  2. ¿Cuál es el hallazgo clave? (1 insight principal)
  3. ¿Qué acción recomiendas? (1 recomendación concreta)
  4. ¿Cómo se conecta con los datos del CDR? (1 dato de contexto)
  
  Formato: Párrafo ejecutivo fluido, sin bullets.
  ```
- [ ] Executive brief visible en la UI (collapsible card o sección destacada)
- [ ] Brief se guarda en Supabase (tabla `executive_decisions`)
- [ ] Brief es copiable con 1 click (botón "Copy to clipboard")

**Mockup:**
```tsx
<div className="executive-brief-card">
  <div className="header">
    <span className="icon">📊</span>
    <h3>Executive Brief</h3>
    <button onClick={copyToClipboard}>
      <Copy size={16} />
    </button>
  </div>
  <div className="content">
    <p>{executiveBrief}</p>
  </div>
  <div className="metadata">
    <span>100 palabras</span>
    <span>•</span>
    <span>30 segundos de lectura</span>
  </div>
</div>
```

**Estimación:** 5 story points (4-6 horas)  
**Prioridad:** Alta  
**Dependencias:** US-EI-003

---

### **US-EI-005: Botón Eliminar Documento**

**Como:** CEO  
**Quiero:** Poder eliminar documentos subidos por error o privados  
**Para:** Controlar mi privacidad y mantener limpio el historial

**Criterios de aceptación:**
- [ ] Botón "X" rojo aparece al hacer hover sobre documento en historial
- [ ] Click en X elimina documento del array `docs` (en memoria)
- [ ] Si el documento eliminado estaba seleccionado → limpia vista (vuelve a landing)
- [ ] Confirmación modal (opcional): "¿Eliminar este análisis?"
- [ ] `e.stopPropagation()` para no abrir documento al eliminar

**Mockup:**
```tsx
<div className="relative group">
  <button onClick={() => setSelectedDoc(doc)}>
    <FileIcon />
    <div>
      <p>{doc.fileName}</p>
      <p>{fileTypeLabel}</p>
    </div>
    <CheckCircle />
  </button>
  
  {/* Botón eliminar (visible on hover) */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      setDocs(prev => prev.filter((_, idx) => idx !== i));
      if (selectedDoc === doc) setSelectedDoc(null);
    }}
    className="absolute ... hidden group-hover:flex ..."
    title="Eliminar documento"
  >
    <X size={12} className="text-destructive" />
  </button>
</div>
```

**Estimación:** 2 story points (1-2 horas)  
**Prioridad:** Media  
**Dependencias:** Ninguna

---

## 📝 **HISTORIAS DE USUARIO — ÉPICA 2 (Advanced Features)**

---

### **US-EI-006: Tabla Supabase — `executive_decisions`**

**Como:** Plataforma  
**Quiero:** Guardar log completo de documentos analizados  
**Para:** Auditoría, cumplimiento, y historial de decisiones

**Criterios de aceptación:**
- [ ] Tabla creada en Supabase: `executive_decisions`
- [ ] Columnas:
  ```sql
  CREATE TABLE executive_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    user_email TEXT,
    
    -- Documento
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes INTEGER,
    upload_timestamp TIMESTAMPTZ DEFAULT now(),
    
    -- Extracción
    extracted_content TEXT,
    
    -- Análisis
    vicky_analysis TEXT NOT NULL,
    executive_brief TEXT,
    vicky_sources JSONB,
    
    -- CDR snapshot
    cdr_snapshot JSONB,
    
    -- Metadata
    processing_time_ms INTEGER,
    model_used TEXT DEFAULT 'gpt-4o',
    
    -- Compliance
    relevance_check BOOLEAN,
    rejected BOOLEAN,
    rejection_reason TEXT,
    
    CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES clients(client_id)
  );
  
  CREATE INDEX idx_exec_decisions_client ON executive_decisions(client_id);
  CREATE INDEX idx_exec_decisions_timestamp ON executive_decisions(upload_timestamp DESC);
  ```
- [ ] RLS (Row Level Security) configurado por `client_id`
- [ ] Función `logExecutiveDecision()` en frontend
- [ ] Test de inserción exitoso

**Estimación:** 3 story points (2-3 horas)  
**Prioridad:** Alta  
**Dependencias:** Ninguna

---

### **US-EI-007: Persistencia — Guardar análisis en Supabase**

**Como:** CEO  
**Quiero:** Que mis análisis se guarden automáticamente  
**Para:** No perder historial al cerrar sesión

**Criterios de aceptación:**
- [ ] Después de `analyzeDocument()` → insertar en `executive_decisions`
- [ ] Campos guardados:
  - `file_name`, `file_type`, `file_size_bytes`
  - `extracted_content` (primeros 50KB)
  - `vicky_analysis`
  - `executive_brief`
  - `cdr_snapshot` (total_llamadas, tasa_contacto, aht, fecha)
  - `processing_time_ms`
  - `relevance_check` (true/false)
  - `rejected` (true si Vicky rechazó por irrelevante)
  - `rejection_reason` (si aplica)
- [ ] Manejo de errores: si Supabase falla, análisis sigue mostrándose en UI (no bloquear)
- [ ] Log en consola si insert falla

**Estimación:** 5 story points (4-6 horas)  
**Prioridad:** Alta  
**Dependencias:** US-EI-006

---

### **US-EI-008: Historial Persistente — Cargar análisis previos**

**Como:** CEO  
**Quiero:** Ver historial de documentos analizados anteriormente  
**Para:** Revisar decisiones pasadas sin re-analizar

**Criterios de aceptación:**
- [ ] Al abrir módulo, query a Supabase: últimos 100 análisis del `client_id`
- [ ] Sección "Análisis Recientes" en sidebar con scroll
- [ ] Cada item muestra:
  - Icono de tipo de archivo
  - Nombre del archivo (truncado si muy largo)
  - Fecha de análisis (relativa: "Hace 2 días")
  - Badge verde "Aprobado" o rojo "Rechazado"
- [ ] Click en item → carga análisis completo
- [ ] Botón "Ver todos" → nueva página `/executive-insights/history`

**Mockup:**
```tsx
<div className="history-sidebar">
  <h3>Análisis Recientes</h3>
  {recentAnalyses.map((analysis) => (
    <button
      key={analysis.id}
      onClick={() => loadAnalysis(analysis.id)}
      className="analysis-item"
    >
      <FileIcon type={analysis.file_type} />
      <div className="flex-1 min-w-0">
        <p className="truncate">{analysis.file_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(analysis.upload_timestamp)}
        </p>
      </div>
      <span className={cn(
        "badge",
        analysis.rejected ? "badge-destructive" : "badge-success"
      )}>
        {analysis.rejected ? "Rechazado" : "Aprobado"}
      </span>
    </button>
  ))}
  <button className="see-all">Ver todos →</button>
</div>
```

**Estimación:** 8 story points (1-2 días)  
**Prioridad:** Media  
**Dependencias:** US-EI-007

---

### **US-EI-009: Benchmark Comparator — Extracción de métricas**

**Como:** CEO  
**Quiero:** Ver comparación automática de mis métricas vs benchmarks del documento  
**Para:** Identificar gaps cuantificados

**Criterios de aceptación:**
- [ ] Prompt adicional a Vicky:
  ```
  Del documento analizado, extrae TODAS las métricas de benchmark mencionadas.
  
  Formato JSON:
  {
    "benchmarks": [
      {
        "metric": "tasa_contacto",
        "benchmark_value": 60,
        "benchmark_source": "promedio industria",
        "top_quartile": 75,
        "bottom_quartile": 45,
        "unit": "%"
      },
      ...
    ]
  }
  ```
- [ ] Vicky cruza con CDR para obtener valor actual del cliente
- [ ] Componente `BenchmarkCard` muestra:
  - Métrica
  - Tu valor vs benchmark (visual, ej: gauge)
  - Gap % (positivo o negativo)
  - Posicionamiento (por encima/debajo/en línea)
- [ ] Guardar benchmarks en `executive_decisions.benchmarks` (JSONB)

**Mockup:**
```tsx
<div className="benchmark-card">
  <h4>Tasa de Contacto</h4>
  <div className="gauge">
    <GaugeChart
      current={68.5}
      benchmark={60}
      topQuartile={75}
    />
  </div>
  <div className="stats">
    <div className="stat">
      <span className="label">Tu performance:</span>
      <span className="value">68.5%</span>
    </div>
    <div className="stat">
      <span className="label">Promedio industria:</span>
      <span className="value">60.0%</span>
    </div>
    <div className="stat success">
      <span className="label">Gap:</span>
      <span className="value">+14% ✅</span>
    </div>
  </div>
  <p className="insight">
    Estás 8.5 puntos porcentuales por encima del promedio,
    pero 6.5 puntos por debajo del top quartile.
  </p>
</div>
```

**Estimación:** 13 story points (2-3 días)  
**Prioridad:** Media  
**Dependencias:** US-EI-004

---

### **US-EI-010: Página de Historial Completo**

**Como:** CEO  
**Quiero:** Ver tabla completa de todos mis análisis con filtros  
**Para:** Auditoría y búsqueda rápida

**Criterios de aceptación:**
- [ ] Ruta nueva: `/executive-insights/history`
- [ ] Tabla con columnas:
  - Fecha
  - Documento
  - Tipo
  - Executive Brief (collapsible)
  - Estado (Aprobado/Rechazado)
  - Acciones (Ver completo / Eliminar)
- [ ] Filtros:
  - Por fecha (últimos 7 días, 30 días, custom)
  - Por tipo de documento (framework, benchmark, financial, etc.)
  - Por estado (aprobado, rechazado, todos)
- [ ] Paginación (20 items por página)
- [ ] Export CSV (para auditoría)
- [ ] Búsqueda por nombre de archivo

**Estimación:** 13 story points (2-3 días)  
**Prioridad:** Baja  
**Dependencias:** US-EI-008

---

## 📝 **HISTORIAS DE USUARIO — ÉPICA 3 (Integration & Automation)**

---

### **US-EI-011: API REST — POST /api/executive-insights/analyze**

**Como:** Developer externo  
**Quiero:** API para analizar documentos programáticamente  
**Para:** Integrar Executive Insights en flujos automatizados

**Criterios de aceptación:**
- [ ] Endpoint: `POST /api/executive-insights/analyze`
- [ ] Request body:
  ```json
  {
    "file": "base64...",
    "file_name": "swot-mckinsey.pdf",
    "client_id": "wekall",
    "webhook_url": "https://external.com/callback" // opcional
  }
  ```
- [ ] Response:
  ```json
  {
    "analysis_id": "uuid",
    "status": "completed",
    "executive_brief": "...",
    "vicky_analysis": "...",
    "benchmarks": [...],
    "created_at": "2026-05-01T16:00:00Z"
  }
  ```
- [ ] Auth: API key en header `Authorization: Bearer <key>`
- [ ] Rate limiting: 10 requests/hora por client_id
- [ ] Webhook opcional: POST callback cuando análisis completa

**Estimación:** 13 story points (2-3 días)  
**Prioridad:** Baja  
**Dependencias:** US-EI-007

---

### **US-EI-012: Auto-clasificación de documentos (ML)**

**Como:** CEO  
**Quiero:** Que Vicky detecte automáticamente el tipo de documento  
**Para:** No tener que especificar manualmente

**Criterios de aceptación:**
- [ ] Modelo ML (DistilBERT o BERT-tiny) entrenado con historial
- [ ] Categorías:
  - `framework` — Frameworks (SWOT, Canvas, OKRs)
  - `benchmark` — Benchmarks (Gartner, Forrester, etc.)
  - `financial` — Informes financieros
  - `market_research` — Estudios de mercado
  - `contract` — Contratos
  - `strategy` — Estrategias
  - `best_practice` — Best practices
  - `transcript` — Transcripciones
  - `other` — Otros
- [ ] Confidence score visible
- [ ] Si confidence < 70% → pregunta al usuario
- [ ] Clasificación guardada en `executive_decisions.document_type`

**Estimación:** 21 story points (1 semana)  
**Prioridad:** Baja  
**Dependencias:** US-EI-008 (necesita historial para entrenar)

---

### **US-EI-013: Batch Upload — Múltiples archivos**

**Como:** CEO  
**Quiero:** Subir múltiples documentos a la vez  
**Para:** Procesar varios benchmarks de una conferencia

**Criterios de aceptación:**
- [ ] Input `multiple` en zona de upload
- [ ] Drag & drop de múltiples archivos
- [ ] Queue visual con status por archivo:
  - ⏳ En cola
  - 🔄 Procesando
  - ✅ Completado
  - ❌ Error
- [ ] Procesamiento secuencial (no paralelo, para evitar rate limits de GPT-4o)
- [ ] Botón "Cancelar todos"
- [ ] Notificación cuando batch completa

**Mockup:**
```tsx
<div className="batch-upload">
  <input 
    type="file" 
    multiple 
    onChange={handleBatchUpload}
  />
  
  <div className="upload-queue">
    {queue.map((file, i) => (
      <div key={i} className="queue-item">
        <FileIcon type={file.type} />
        <span>{file.name}</span>
        <span className="status">
          {file.status === 'processing' && <Loader2 className="animate-spin" />}
          {file.status === 'done' && <CheckCircle className="text-green-500" />}
          {file.status === 'error' && <XCircle className="text-destructive" />}
        </span>
      </div>
    ))}
  </div>
</div>
```

**Estimación:** 8 story points (1-2 días)  
**Prioridad:** Baja  
**Dependencias:** US-EI-004

---

## 📊 **RESUMEN DE BACKLOG**

### **Épica 1: Core Module (Alta prioridad)**

| ID | Historia | Story Points | Prioridad |
|----|----------|--------------|-----------|
| US-EI-001 | Renaming | 2 | Alta |
| US-EI-002 | Landing Page | 5 | Alta |
| US-EI-003 | Validación Relevancia | 3 | Alta |
| US-EI-004 | Executive Brief | 5 | Alta |
| US-EI-005 | Botón Eliminar | 2 | Media |
| **TOTAL** | **5 historias** | **17 SP** | **~2 sprints** |

---

### **Épica 2: Advanced Features (Media prioridad)**

| ID | Historia | Story Points | Prioridad |
|----|----------|--------------|-----------|
| US-EI-006 | Tabla Supabase | 3 | Alta |
| US-EI-007 | Persistencia | 5 | Alta |
| US-EI-008 | Historial Persistente | 8 | Media |
| US-EI-009 | Benchmark Comparator | 13 | Media |
| US-EI-010 | Página Historial Completo | 13 | Baja |
| **TOTAL** | **5 historias** | **42 SP** | **~3-4 sprints** |

---

### **Épica 3: Integration & Automation (Baja prioridad)**

| ID | Historia | Story Points | Prioridad |
|----|----------|--------------|-----------|
| US-EI-011 | API REST | 13 | Baja |
| US-EI-012 | Auto-clasificación ML | 21 | Baja |
| US-EI-013 | Batch Upload | 8 | Baja |
| **TOTAL** | **3 historias** | **42 SP** | **~3-4 sprints** |

---

## 🎯 **ROADMAP SUGERIDO**

### **Sprint 1-2: MVP (Épica 1 Core)**
- US-EI-001 a US-EI-005
- **Entregable:** Módulo renombrado + landing page + executive brief + validación relevancia
- **Valor:** C-suite puede usar módulo con valor claro

### **Sprint 3-4: Persistencia (Épica 2 - Parte 1)**
- US-EI-006 a US-EI-008
- **Entregable:** Historial guardado + análisis persistentes
- **Valor:** No se pierde información al cerrar sesión

### **Sprint 5-6: Benchmarks (Épica 2 - Parte 2)**
- US-EI-009 a US-EI-010
- **Entregable:** Comparación automática vs benchmarks + página de historial
- **Valor:** Insights cuantificados vs industria

### **Sprint 7-9: Automation (Épica 3)**
- US-EI-011 a US-EI-013
- **Entregable:** API + auto-clasificación + batch upload
- **Valor:** Escalabilidad + automatización

---

## 📝 **NOTAS TÉCNICAS**

### **Arquitectura compartida con Vicky Chat:**

```typescript
// Backend compartido (no duplicar)
class VickyAnalysisEngine {
  async analyze(
    input: Question | Document,
    context: CDRData,
    options: { 
      generateBrief?: boolean,
      extractBenchmarks?: boolean 
    }
  ) {
    // Lógica común
  }
}

// Vicky Chat usa:
const response = await VickyAnalysisEngine.analyze(
  userQuestion,
  cdrData,
  { generateBrief: false }
);

// Executive Insights usa:
const analysis = await VickyAnalysisEngine.analyze(
  uploadedDoc,
  cdrData,
  { generateBrief: true, extractBenchmarks: true }
);
```

### **Escalabilidad:**

- Executive Insights está diseñado para **escalar horizontalmente**:
  - Si en el futuro se agrega "Vicky Forecasting" → nuevo módulo, mismo `VickyAnalysisEngine`
  - Si se agrega "Vicky Benchmarking" → nuevo módulo, comparte tabla `executive_decisions`
  - Permisos granulares por módulo (RLS en Supabase)

---

## ✅ **PRÓXIMOS PASOS**

1. **Review de historias** con equipo de producto
2. **Priorización** en backlog de Scale
3. **Estimación refinada** en planning poker
4. **Asignación a sprints** según capacidad

---

**Autor:** GlorIA AI  
**Fecha:** 01 de mayo de 2026  
**Status:** Backlog documentado — listo para Scale planning
