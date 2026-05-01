# 📝 Changelog - Mejoras "Subir y Analizar"

Todas las mejoras implementadas basadas en el reporte UAT del 01 de mayo de 2026.

---

## [1.1.0] - 01/may/2026 - Mejoras UAT Prioridad Alta

### ✅ Agregado

#### **1. Validación de Tamaño Frontend - Audio e Imagen**

**Problema anterior:**
- Archivos de audio e imagen se subían sin validar tamaño
- Podían fallar en backend (Whisper API límite 25MB, Vision timeout >10MB)
- Sin feedback claro para el usuario

**Solución implementada:**
```typescript
// Constantes de límite
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

// Validación en processFile()
if (fileType === 'audio' && file.size > MAX_AUDIO_SIZE) {
  throw new Error(
    'El archivo de audio supera el límite de 25 MB. ' +
    'Por favor, comprime el archivo o sube uno más pequeño.'
  );
}

if (fileType === 'image' && file.size > MAX_IMAGE_SIZE) {
  throw new Error(
    'La imagen supera el límite de 10 MB. ' +
    'Por favor, reduce la resolución o comprime el archivo.'
  );
}
```

**Beneficios:**
- ✅ Previene errores en backend
- ✅ Feedback inmediato al usuario
- ✅ Mensaje con instrucciones claras

**Archivos modificados:**
- `src/pages/DocumentAnalysis.tsx` (líneas 310-332)

---

#### **2. Mensaje de Error Mejorado - WhatsApp Chat**

**Problema anterior:**
```typescript
// ANTES: Genérico, no ayuda al usuario
fileType = 'unknown';
extractedText = rawText.slice(0, 15000);
```

**Solución implementada:**
```typescript
// DESPUÉS: Mensaje educativo con instrucciones
if (!isWhatsAppChat(rawText)) {
  throw new Error(
    'El archivo TXT no tiene formato de chat WhatsApp válido.\n\n' +
    'Para exportar un chat:\n' +
    '1. Abre WhatsApp > Chat deseado\n' +
    '2. Toca los 3 puntos (Menú) > Más > Exportar chat\n' +
    '3. Selecciona "Sin multimedia"\n' +
    '4. Guarda el archivo .txt y súbelo aquí\n\n' +
    'Formato esperado: [DD/MM/YY, HH:MM:SS] Nombre: Mensaje'
  );
}
```

**Beneficios:**
- ✅ Usuario sabe exactamente qué hacer
- ✅ Reduce intentos fallidos
- ✅ Muestra formato esperado

**Archivos modificados:**
- `src/pages/DocumentAnalysis.tsx` (líneas 354-366)

---

### 📊 Impacto

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Errores de audio >25MB** | Backend rechaza | Frontend previene | ✅ 100% menos requests fallidos |
| **Errores de imagen >10MB** | Timeout/memoria | Frontend previene | ✅ 100% menos timeouts |
| **WhatsApp inválido** | Genérico "unknown" | Instrucciones claras | ✅ Mejor UX |

---

## [Pendiente] - Mejoras Prioridad Media

### 🔄 En backlog

#### **3. Bundlear PDF.js Worker Localmente**

**Problema:**
```typescript
// Dependencia de CDN externo
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
```

**Solución propuesta:**
```bash
npm install pdfjs-dist
```

```typescript
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
```

**Beneficios:**
- Elimina dependencia externa
- Más robusto (no depende de CDN)
- Mejor performance (bundle local)

---

#### **4. Indicador de Progreso**

Agregar spinner con porcentaje durante procesamiento de archivos grandes.

---

#### **5. Tooltips con Ejemplos**

Mostrar formato esperado para cada tipo de archivo al hacer hover.

---

## [Rechazado] - No implementado

Ninguno. Todas las mejoras de prioridad alta fueron implementadas.

---

## 🧪 Testing

### **Casos de prueba validados post-mejora:**

#### **Test 1: Audio >25MB**
- **Input:** `audio-large.mp3` (30 MB)
- **Esperado:** Rechazado con mensaje claro
- **Resultado:** ✅ PASS

#### **Test 2: Audio <25MB**
- **Input:** `audio-small.mp3` (10 MB)
- **Esperado:** Procesado normalmente
- **Resultado:** ✅ PASS

#### **Test 3: Imagen >10MB**
- **Input:** `image-large.png` (15 MB)
- **Esperado:** Rechazado con mensaje claro
- **Resultado:** ✅ PASS

#### **Test 4: Imagen <10MB**
- **Input:** `image-small.jpg` (5 MB)
- **Esperado:** Procesado normalmente
- **Resultado:** ✅ PASS

#### **Test 5: WhatsApp inválido**
- **Input:** `plain-text.txt` (sin formato WhatsApp)
- **Esperado:** Mensaje con instrucciones
- **Resultado:** ✅ PASS

#### **Test 6: WhatsApp válido**
- **Input:** `whatsapp-valid.txt`
- **Esperado:** Parser extrae participantes y mensajes
- **Resultado:** ✅ PASS

---

## 📦 Deploy

**Commit:** `pending`  
**Branch:** `main`  
**Build:** ✅ Exitoso (4.20s)  
**Deploy:** Pendiente push

**Comando:**
```bash
cd /Users/celeru/.openclaw/workspace/WeIntelligence
npm run build
git add -A
git commit -m "feat: UAT mejoras prioridad alta - validación tamaño + mensaje WhatsApp"
git push
```

---

## 📚 Documentación Relacionada

- `testing/uat/subir-analizar/UAT-REPORT.md` — Reporte completo UAT
- `testing/uat/subir-analizar/test-files/README.md` — Archivos de prueba
- `src/pages/DocumentAnalysis.tsx` — Componente principal

---

**Autor:** GlorIA AI  
**Review:** Fabián Saavedra  
**Fecha:** 01 de mayo de 2026
