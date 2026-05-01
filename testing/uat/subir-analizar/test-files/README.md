# 📁 Archivos de Prueba UAT - "Subir y Analizar"

Estos archivos se utilizan para validar la funcionalidad de carga y análisis de documentos en WeKall Intelligence.

---

## 🎧 Audio

**Formatos soportados:** MP3, WAV, M4A, OGG, FLAC, WebM, MP4

**Límite:** 25 MB (validado en frontend desde 01/may/2026)

**Test case:**
- Subir archivo de audio de llamada del contact center
- Esperado: Transcripción via Whisper API (idioma español)
- Backend: `${PROXY_URL}/transcribe`

**Archivos de ejemplo:**
- `test-audio.mp3` (pendiente: crear archivo real)
- `test-audio-long.wav` (pendiente: >25MB para validar rechazo)

---

## 📄 PDF

**Formatos soportados:** .pdf

**Límite:** 20 páginas, 15,000 caracteres

**Test case:**
- Subir PDF con contenido mixto (texto + tablas)
- Esperado: Extracción con pdf.js
- Procesamiento: Local (worker CDN Cloudflare)

**Archivos de ejemplo:**
- `test-document.pdf` (pendiente: crear con 5 páginas)
- `test-document-long.pdf` (pendiente: >20 páginas para validar truncamiento)

---

## 📊 Excel

**Formatos soportados:** .xlsx, .xls

**Límite:** 15,000 caracteres

**Test case:**
- Subir Excel con múltiples hojas
- Esperado: Conversión a CSV (todas las hojas)
- Procesamiento: Local (SheetJS)

**Archivos de ejemplo:**
- `test-spreadsheet.xlsx` (pendiente: crear con 3 hojas)

---

## 📊 CSV

**Formatos soportados:** .csv

**Límite:** 15,000 caracteres

**Test case:**
- Subir CSV con datos del contact center
- Esperado: Lectura directa
- Procesamiento: Local (SheetJS)

**Archivos de ejemplo:**
- `test-data.csv` (pendiente: crear con llamadas simuladas)

---

## 💬 WhatsApp Chat

**Formatos soportados:** .txt (con formato específico)

**Límite:** 8,000 caracteres (para análisis)

**Formato esperado:**
```
[DD/MM/YY, HH:MM:SS] Nombre: Mensaje
```

**Test case:**
- Subir chat exportado de WhatsApp
- Esperado: Parser extrae participantes y mensajes
- Validación: Regex detecta patrón de fecha/hora

**Archivos de ejemplo:**
- ✅ `whatsapp-valid.txt` — Chat válido con 8 mensajes, 2 participantes
- `whatsapp-invalid.txt` (pendiente: texto plano sin formato WhatsApp)

---

## 🖼️ Imagen

**Formatos soportados:** JPG, PNG, GIF, WebP

**Límite:** 10 MB (validado en frontend desde 01/may/2026)

**Test case:**
- Subir screenshot o foto de documento
- Esperado: Base64 encode + análisis con GPT-4o Vision
- Backend: `${PROXY_URL}/chat`

**Archivos de ejemplo:**
- `test-image.jpg` (pendiente: screenshot de dashboard)
- `test-image-large.png` (pendiente: >10MB para validar rechazo)

---

## 🧪 Casos de Prueba Especiales

### **Archivo inválido**
- `virus.exe` — Debe ser rechazado por input filter

### **Texto plano sin formato WhatsApp**
- `plain-text.txt` — Debe mostrar mensaje de error mejorado (desde 01/may/2026)

### **PDF muy largo**
- `manual-50-pages.pdf` — Debe truncarse a 20 páginas

---

## 📝 Instrucciones de Uso

1. **Abrir página:** https://wekall-intelligence.pages.dev/document-analysis
2. **Arrastrar archivo** a la zona de drop o hacer click
3. **Validar:**
   - Extracción de contenido correcta
   - Análisis con Vicky Insights funcional
   - Manejo de errores claro

---

**Mantenido por:** GlorIA AI  
**Última actualización:** 01 de mayo de 2026
