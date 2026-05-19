# Acuerdo de Tratamiento de Datos (DPA) — WeKall Intelligence

**Template legal · Sprint 3 P3-7 · 2026-05-18**

> Este documento es un template de Data Processing Agreement que se firma entre
> **WeKall** (Encargado del Tratamiento) y el **Cliente** (Responsable del Tratamiento)
> al activar el servicio WeKall Intelligence. Cumple con Habeas Data Colombia
> (Ley 1581 de 2012 + Decreto 1377 de 2013) y GDPR (Regulación UE 2016/679)
> cuando aplica.
>
> **Revisión legal pendiente.** Pasar por abogado externo antes de firmar con clientes reales.

---

## 1. Definiciones

| Término | Definición |
|---|---|
| **Datos Personales** | Cualquier información relacionada con una persona natural identificada o identificable, incluyendo nombre, identificación, dirección, número de teléfono, correo electrónico, voz, contenido de llamadas. |
| **Datos Sensibles** | Subconjunto de Datos Personales sobre salud, orientación sexual, ideología política, origen étnico, datos biométricos. |
| **Tratamiento** | Cualquier operación sobre Datos Personales: recolección, almacenamiento, uso, circulación, supresión. |
| **Responsable** | El **Cliente** que decide sobre los Datos Personales y los aporta a la plataforma. |
| **Encargado** | **WeKall**, que realiza el Tratamiento por cuenta del Responsable. |
| **Titular** | Persona natural cuyos Datos Personales son objeto de Tratamiento (ej. cliente final del Cliente). |
| **Plataforma** | WeKall Intelligence — `intel.wekall.co`. |

---

## 2. Objeto

WeKall trata Datos Personales del Cliente para prestar el servicio de:
- Almacenamiento y análisis de grabaciones de llamadas (CDR + audio + transcripciones)
- Inteligencia operativa y dashboards
- Asistente Vicky (LLM) sobre datos del Cliente
- Document Intelligence (análisis de PDFs cargados)

---

## 3. Categorías de Datos tratados

Ver `data_classification` table en Supabase. Resumen:

| Categoría | Ejemplos | Sensibilidad | Retención |
|---|---|---|---|
| **Datos de usuarios operadores** (Cliente) | email, nombre, rol | PII | 5 años o hasta cancelación |
| **Datos de clientes finales** (Titulares) | número de teléfono, cédula, voz, contenido de la llamada | PII | 5 años por defecto |
| **Métricas operativas** | volumen, contactos, AHT, CSAT | Confidencial | 5 años |
| **Audit log** | accesos a recursos sensibles | Restringido | 7 años (compliance SOC 2) |
| **Costos de uso** | tokens consumidos por tenant | Confidencial | 3 años (fiscal) |

Datos NO tratados:
- Datos sensibles especiales (salud, orientación sexual, etc.) salvo consentimiento explícito y caso documentado.
- Datos de menores (<14 años) sin autorización de representante legal.

---

## 4. Finalidades

WeKall trata los Datos Personales exclusivamente para:
1. Prestación del servicio contratado.
2. Soporte técnico y gestión de incidentes.
3. Mejora del servicio mediante análisis agregado y anonimizado.
4. Cumplimiento de obligaciones legales (Habeas Data, SOC 2, retención fiscal).

WeKall **NO** trata los Datos para:
- Marketing directo a Titulares.
- Cesión a terceros sin autorización del Cliente.
- Entrenamiento de modelos de IA propios o de terceros sin opt-in explícito.

---

## 5. Obligaciones de WeKall (Encargado)

1. Tratar los Datos solo siguiendo instrucciones documentadas del Cliente.
2. Garantizar confidencialidad de quienes acceden (empleados con NDA + acceso por rol).
3. Implementar medidas técnicas y organizativas:
   - **Cifrado en tránsito** (TLS 1.3) y **en reposo** (AES-256 vía Supabase).
   - **RLS multi-tenant** estricto con custom claim `client_id` en JWT (cierre P0-1).
   - **Audit log** append-only de accesos a recursos sensibles.
   - **MFA opt-in** para usuarios; obligatorio para `wekall_admin` y `ceo`.
   - **Rate limiting** para evitar exfiltración masiva.
   - **PII masking** en exports y logs.
   - **Backups diarios** retenidos 35 días + tests de restauración trimestrales.
4. Notificar **incidentes** al Cliente en **<72 horas** de descubrirlos (Habeas Data + GDPR).
5. Asistir al Cliente en responder a solicitudes de Titulares (acceso, rectificación, supresión).
6. Eliminar o devolver los Datos al finalizar el contrato (a elección del Cliente).
7. Permitir **auditorías** anuales con 15 días de aviso.

---

## 6. Subencargados (sub-procesadores)

WeKall usa los siguientes subencargados para operar:

| Subencargado | Función | Ubicación | Base legal de transferencia |
|---|---|---|---|
| **Cloudflare Inc.** | CDN, Workers, Pages | Global · USA | Standard Contractual Clauses |
| **Supabase Inc.** | DB Postgres + Auth | USA · East | Standard Contractual Clauses |
| **OpenAI LLC** | LLM (GPT-4o-mini) | USA | DPA con opt-out de training |
| **Deepgram Inc.** | Speech-to-text | USA | DPA |
| **Upstash Inc.** | Redis (rate limit / queue) | Global | Standard Contractual Clauses |

WeKall notificará al Cliente con **30 días de anticipación** cualquier cambio o adición de subencargados.

---

## 7. Derechos de los Titulares

WeKall asiste al Cliente para responder solicitudes de Titulares (Habeas Data Art. 8):

| Derecho | Mecanismo |
|---|---|
| Acceso | El Cliente puede exportar datos del Titular vía Admin → Export. |
| Rectificación | El Cliente edita en su Admin. |
| Supresión | `POST /api/gdpr/forget` o solicitud manual a `legal@wekall.co`. SLA: 30 días. |
| Portabilidad | Export en CSV / JSON estándar. |
| Oposición | El Cliente desactiva análisis automatizados para el Titular. |
| Revocación de consentimiento | Mismo que supresión. |

---

## 8. Transferencias internacionales

Los Datos pueden transferirse a USA (Cloudflare, Supabase, OpenAI). Base legal:
- **Standard Contractual Clauses** firmados con cada subencargado.
- **Decisión de adecuación** cuando aplique (EU-US Data Privacy Framework).
- Para Colombia: cumplimiento de la circular 02 de 2024 SIC.

---

## 9. Incidentes de seguridad

WeKall mantiene un proceso de respuesta a incidentes:

1. Detección via monitoreo (Sentry + audit log + alertas).
2. Triage y clasificación de severidad.
3. Notificación al Cliente afectado dentro de **72 horas** vía email + Slack.
4. Notificación a SIC (Colombia) o DPA local cuando proceda.
5. Post-mortem y comunicación al Cliente con timeline + RCA + remediations.

---

## 10. Duración y término

- Este DPA dura mientras dure el servicio.
- Al finalizar:
  - Datos: WeKall ofrece **30 días** para que el Cliente exporte.
  - Después: borrado físico de todos los Datos (con confirmación de borrado).
  - Backups: purga en el siguiente ciclo (≤35 días).
  - Audit log: retenido 7 años por compliance, anonimizado.

---

## 11. Responsabilidad y indemnización

- WeKall responde por incumplimientos de este DPA dentro de los límites de su responsabilidad contractual general.
- El Cliente indemniza a WeKall si sus instrucciones contravienen la ley aplicable.
- Multas regulatorias por incumplimiento son responsabilidad de la parte cuya conducta originó el incumplimiento.

---

## 12. Ley aplicable y jurisdicción

- Ley colombiana (Habeas Data Ley 1581 de 2012) cuando el Cliente o el Titular están en Colombia.
- GDPR cuando el Cliente está en la UE o trata datos de Titulares europeos.
- Jurisdicción: tribunales de Bogotá, Colombia (para clientes locales).

---

## 13. Firmas

**Por el Cliente (Responsable):**

- Nombre: ____________________________
- Cargo: ____________________________
- Empresa: ____________________________
- Fecha: ____________________________
- Firma: ____________________________

**Por WeKall (Encargado):**

- Nombre: Fabián Saavedra
- Cargo: Co-founder
- Empresa: WeKall S.A.S.
- Fecha: ____________________________
- Firma: ____________________________

---

**Anexo A — Detalle técnico de medidas de seguridad** (referenciar `docs/security/`)
**Anexo B — Lista actualizada de subencargados** (mantener en `docs/legal/subprocessors.md`)
**Anexo C — Reportes de auditoría disponibles** (SOC 2 Type II cuando esté disponible)
