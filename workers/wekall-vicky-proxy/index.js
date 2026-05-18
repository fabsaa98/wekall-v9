var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/worker.js
var DIARIZATION_URL_DEFAULT = "https://geometry-becoming-valentine-april.trycloudflare.com";
var CLIENT_ID_ALIASES = {
  "credismart": "crediminuto",
  "credi smart": "crediminuto",
  "credi-smart": "crediminuto"
};
function normalizeClientId(clientId) {
  if (!clientId) return null;
  return CLIENT_ID_ALIASES[clientId.toLowerCase()] || clientId;
}
__name(normalizeClientId, "normalizeClientId");
var worker_default = {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-WeKall-Token"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "GET" && path === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "wekall-vicky-proxy" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    try {
      if (path === "/" || path === "/chat") {
        const body = await request.json();
        const requestedModel = body.model || "gpt-4o";
        const useAnthropicModel = env.ANTHROPIC_API_KEY && (requestedModel.includes("gpt-4o") || requestedModel.includes("claude"));
        if (useAnthropicModel) {
          const messages = body.messages || [];
          const systemMsg = messages.find((m) => m.role === "system");
          const userMessages = messages.filter((m) => m.role !== "system");
          const claudeMessages = userMessages.map((m) => {
            if (m.role === "tool") {
              return { role: "user", content: [{ type: "tool_result", tool_use_id: m.tool_call_id, content: m.content }] };
            }
            if (m.tool_calls) {
              return {
                role: "assistant",
                content: m.tool_calls.map((tc) => ({
                  type: "tool_use",
                  id: tc.id,
                  name: tc.function.name,
                  input: JSON.parse(tc.function.arguments || "{}")
                }))
              };
            }
            return m;
          });
          const claudeTools = (body.tools || []).map((t) => ({
            name: t.function.name,
            description: t.function.description,
            input_schema: t.function.parameters
          }));
          const claudeBody = {
            model: "claude-opus-4-5",
            max_tokens: body.max_tokens || 1500,
            system: systemMsg?.content || "",
            messages: claudeMessages,
            ...claudeTools.length > 0 ? { tools: claudeTools } : {}
          };
          const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": env.ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify(claudeBody)
          });
          const claudeData = await claudeResp.json();
          if (!claudeResp.ok) {
            return new Response(JSON.stringify(claudeData), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: claudeResp.status
            });
          }
          const contentBlocks = claudeData.content || [];
          const toolUseBlocks = contentBlocks.filter((b) => b.type === "tool_use");
          const textBlocks = contentBlocks.filter((b) => b.type === "text");
          let openAIChoice;
          if (toolUseBlocks.length > 0) {
            openAIChoice = {
              index: 0,
              finish_reason: "tool_calls",
              message: {
                role: "assistant",
                content: null,
                tool_calls: toolUseBlocks.map((b) => ({
                  id: b.id,
                  type: "function",
                  function: {
                    name: b.name,
                    arguments: JSON.stringify(b.input)
                  }
                }))
              }
            };
          } else {
            openAIChoice = {
              index: 0,
              finish_reason: claudeData.stop_reason === "end_turn" ? "stop" : claudeData.stop_reason,
              message: {
                role: "assistant",
                content: textBlocks.map((b) => b.text).join("\n") || ""
              }
            };
          }
          const openAICompatible = {
            id: claudeData.id,
            object: "chat.completion",
            model: claudeData.model,
            choices: [openAIChoice],
            usage: {
              prompt_tokens: claudeData.usage?.input_tokens || 0,
              completion_tokens: claudeData.usage?.output_tokens || 0,
              total_tokens: (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0)
            }
          };
          return new Response(JSON.stringify(openAICompatible), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`
          },
          body: JSON.stringify(body)
        });
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status
        });
      }
      if (path === "/transcribe") {
        const formData = await request.formData();
        const openaiForm = new FormData();
        const audioFile = formData.get("file");
        const model = formData.get("model") || "whisper-1";
        const language = formData.get("language") || "es";
        openaiForm.append("file", audioFile);
        openaiForm.append("model", model);
        openaiForm.append("language", language);
        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`
          },
          body: openaiForm
        });
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status
        });
      }
      if (path === "/diarize") {
        const diarizationUrl = (env.DIARIZATION_URL || DIARIZATION_URL_DEFAULT) + "/diarize";
        const audioData = await request.arrayBuffer();
        const contentType = request.headers.get("Content-Type") || "audio/wav";
        const response = await fetch(diarizationUrl, {
          method: "POST",
          headers: { "Content-Type": contentType },
          body: audioData
        });
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status
        });
      }
      if (path === "/ingest") {
        const body = await request.json();
        const {
          audio_url,
          transcript: incomingTranscript,
          // ← pipeline de Felipe puede enviar el transcript directo
          summary: incomingSummary,
          // ← o incluso el summary ya procesado por Qwen
          agent_id,
          agent_name,
          campaign_id,
          call_date,
          call_type,
          client_id,
          duration_seconds,
          speakers
          // ← diarización estéreo de Felipe: [{speaker, text, start, end}]
        } = body;
        // Fix: requerir client_id explicito. Antes defaulteaba a "credismart"
        // — cualquier llamada al endpoint sin client_id metia datos en el
        // cliente equivocado silenciosamente.
        if (!client_id) {
          return new Response(JSON.stringify({ error: "Se requiere client_id en el body" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        if (!audio_url && !incomingTranscript) {
          return new Response(JSON.stringify({ error: "Se requiere audio_url o transcript" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        let transcript = incomingTranscript || "";
        if (!transcript && audio_url) {
          const audioResp = await fetch(audio_url);
          const audioBlob = await audioResp.blob();
          const formData = new FormData();
          formData.append("file", audioBlob, "call.wav");
          formData.append("model", "whisper-1");
          formData.append("language", "es");
          const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}` },
            body: formData
          });
          const whisperData = await whisperResp.json();
          transcript = whisperData.text || "";
        }
        let summary = incomingSummary || "";
        if (!summary) {
          // Fix: vocabulario dinamico por client_id / industria. Sin el branch
          // anterior solo se usaba el de credismart o un generico que no servia
          // para salud, fintech, retail, etc.
          const domainVocabByClient = {
            credismart: "mora, cartera vencida, cuota, promesa de pago, fecha compromiso, refinanciacion, acuerdo de pago, deuda, cobro",
            crediminuto: "mora, cartera vencida, cuota, promesa de pago, fecha compromiso, refinanciacion, acuerdo de pago, deuda, cobro",
            saludtotal: "autorizacion, urgencia, remision, IPS, EPS, afiliado, cirugia, medicamento, historia clinica, orden medica, PBS, PAC, cobertura, copago",
            bold: "datafono, pasarela de pagos, transaccion, comercio, cuenta digital, activacion, soporte tecnico",
            bold2: "datafono, pasarela de pagos, transaccion, comercio, cuenta digital, activacion, soporte tecnico",
            wekall: "telefonia, business phone, contact center, engage 360, vicky AI, messenger hub, soporte",
            loggro: "software contable, facturacion, nomina, soporte tecnico"
          };
          const domainVocab = domainVocabByClient[client_id] || "cliente, servicio, soporte, venta, contrato, plan, factura";
          const summaryResp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.OPENAI_API_KEY}` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{
                role: "system",
                content: `Eres un analista experto en contact centers. Analiza la llamada y responde \xDANICAMENTE con este formato exacto (sin texto adicional):

Tema: [m\xE1x 8 palabras describiendo el asunto principal]
Resultado: [una de: promesa de pago | sin acuerdo | no contacto | informaci\xF3n entregada | escalamiento | otro]
Tono del cliente: [uno de: positivo | negativo | neutral | hostil]
Objeciones: [lista separada por comas de objeciones detectadas, o "ninguna"]
Notas: [1 frase con el dato m\xE1s relevante para el supervisor]

Vocabulario del dominio: ${domainVocab}`
              }, { role: "user", content: transcript.slice(0, 3e3) }],
              max_tokens: 250
            })
          });
          const summaryData = await summaryResp.json();
          summary = summaryData.choices?.[0]?.message?.content || "";
        }
        if (speakers && Array.isArray(speakers) && speakers.length > 0 && !incomingTranscript) {
          transcript = speakers.sort((a, b) => (a.start || 0) - (b.start || 0)).map((s) => `[${s.speaker === "agent" ? "AGENTE" : "CLIENTE"}] ${s.text}`).join("\n");
        }
        const embedResp = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.OPENAI_API_KEY}` },
          body: JSON.stringify({ model: "text-embedding-3-small", input: transcript.slice(0, 8e3) })
        });
        const embedData = await embedResp.json();
        const embedding = embedData.data?.[0]?.embedding;
        // Fix: usar SERVICE_KEY para bypassa RLS en el INSERT a transcriptions.
        // Antes se usaba ANON_KEY pero la RLS policy bloquea anon INSERT,
        // causando HTTP 500 silencioso. SERVICE_KEY es el unico way con
        // las policies actuales hasta que se agregue una policy "anon can
        // insert via Worker" (que tiene su propio riesgo de seguridad).
        // Fallback: si por algun motivo SERVICE_KEY no esta seteado en
        // CF Secrets, cae a ANON_KEY (comportamiento legacy, mismo bug).
        const insertKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
        const supabaseResp = await fetch(`${env.SUPABASE_URL}/rest/v1/transcriptions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": insertKey,
            "Authorization": `Bearer ${insertKey}`,
            "Prefer": "return=representation"
          },
          // Fix: la columna en transcriptions se llama `campaign` (display
          // name humano), no `campaign_id`. Antes el INSERT fallaba con
          // PGRST204 "Could not find the campaign_id column" silenciosamente.
          // Acepto campaign_id en el body por compat con clientes existentes.
          body: JSON.stringify({
            agent_id,
            agent_name,
            campaign: body.campaign || campaign_id,
            call_date,
            call_type,
            transcript,
            summary,
            embedding,
            client_id,
            ...duration_seconds ? { duration_seconds } : {}
          })
        });
        const saved = await supabaseResp.json();
        if (!supabaseResp.ok) {
          // Log el error real para debugging — antes el Worker devolvia
          // solo "status:error" sin detalle, lo cual hizo el debug muy dificil.
          console.error("[/ingest] supabase INSERT failed", {
            http: supabaseResp.status,
            body: saved
          });
        }
        return new Response(JSON.stringify({
          status: supabaseResp.ok ? "ok" : "error",
          id: saved?.[0]?.id || null,
          agent_name,
          client_id,
          transcript_chars: transcript.length,
          summary_preview: summary.slice(0, 200)
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: supabaseResp.ok ? 200 : 500
        });
      }
      if (path === "/rag-query") {
        const body = await request.json();
        const { query, match_count = 5, client_id = null } = body;
        const embedResp = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.OPENAI_API_KEY}` },
          body: JSON.stringify({ model: "text-embedding-3-small", input: query })
        });
        const embedData = await embedResp.json();
        const queryEmbedding = embedData.data?.[0]?.embedding;
        const searchResp = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/search_transcriptions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": env.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            query_embedding: queryEmbedding,
            match_count,
            client_id_filter: client_id
            // null = sin filtro (solo para dev); siempre pasar en producción
          })
        });
        const results = await searchResp.json();
        const context = (results || []).map(
          (r) => `[${r.agent_name || r.agent_id} \xB7 ${r.call_date}]
${r.transcript}`
        ).join("\n\n---\n\n");
        const chatResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: `Eres Vicky, analista de contact center de clase mundial. Responde bas\xE1ndote en estas transcripciones reales:

${context}` },
              { role: "user", content: query }
            ]
          })
        });
        const chatData = await chatResp.json();
        return new Response(JSON.stringify({
          answer: chatData.choices?.[0]?.message?.content,
          sources: (results || []).map((r) => ({ agent: r.agent_name, date: r.call_date }))
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (path === "/auth") {
        const body = await request.json();
        const { email, password, client_id_hint } = body;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1e4);
        try {
          const resp = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": env.SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ email, password }),
            signal: controller.signal
          });
          clearTimeout(timeout);
          const json = await resp.json();
          if (!resp.ok) {
            return new Response(JSON.stringify({ error: "Credenciales incorrectas" }), {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          let resolvedClientId = client_id_hint || null;
          if (!resolvedClientId && email) {
            try {
              const svcKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
              const appUserResp = await fetch(
                `${env.SUPABASE_URL}/rest/v1/app_users?email=eq.${encodeURIComponent(email)}&active=eq.true&select=client_id,role,name&limit=1`,
                { headers: { "apikey": svcKey, "Authorization": `Bearer ${svcKey}` } }
              );
              const appUsers = await appUserResp.json();
              if (Array.isArray(appUsers) && appUsers.length > 0) {
                resolvedClientId = appUsers[0].client_id;
              }
            } catch {
            }
          }
          if (!resolvedClientId) {
            resolvedClientId = json.user?.user_metadata?.client_id || null;
          }
          return new Response(JSON.stringify({
            access_token: json.access_token,
            refresh_token: json.refresh_token,
            user: json.user,
            client_id: resolvedClientId
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (authErr) {
          clearTimeout(timeout);
          const isTimeout = authErr instanceof Error && authErr.name === "AbortError";
          return new Response(JSON.stringify({ error: isTimeout ? "auth_timeout" : "auth_error" }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      if (path === "/admin-create-user") {
        const body = await request.json();
        const { email, password, client_id, role, name } = body;
        if (!email || !password || !client_id) {
          return new Response(JSON.stringify({ error: "email, password y client_id requeridos" }), { status: 400, headers: corsHeaders });
        }
        const svcKey = env.SUPABASE_SERVICE_KEY;
        const authResp = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": svcKey, "Authorization": `Bearer ${svcKey}` },
          body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { client_id, role: role || "CEO", name: name || email } })
        });
        const authData = await authResp.json();
        if (!authResp.ok) {
          return new Response(JSON.stringify({ error: "auth_error", detail: authData }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ ok: true, user_id: authData.id, email: authData.email }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (path === "/query") {
        const body = await request.json();
        let { table, select = "*", filters = {}, order, limit, offset, rpc, rpc_body, params, client_id: rawClientId } = body;
        const client_id = normalizeClientId(rawClientId);
        const supabaseUrl = env.SUPABASE_URL;
        const queryKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
        const headers = {
          "Content-Type": "application/json",
          "apikey": queryKey,
          "Authorization": `Bearer ${queryKey}`
        };
        let targetUrl;
        let fetchOptions;
        if (rpc) {
          const rpcParams = rpc_body || params || {};
          targetUrl = `${supabaseUrl}/rest/v1/rpc/${rpc}`;
          fetchOptions = { method: "POST", headers, body: JSON.stringify(rpcParams) };
        } else if (body.insert) {
          targetUrl = `${supabaseUrl}/rest/v1/${table}`;
          fetchOptions = {
            method: "POST",
            headers: { ...headers, "Prefer": "return=representation" },
            body: JSON.stringify(body.insert)
          };
        } else if (body.upsert) {
          targetUrl = `${supabaseUrl}/rest/v1/${table}`;
          fetchOptions = {
            method: "POST",
            headers: { ...headers, "Prefer": `resolution=merge-duplicates,return=representation` },
            body: JSON.stringify(body.upsert)
          };
        } else if (body.update) {
          const params2 = new URLSearchParams();
          for (const [key, value] of Object.entries(body.filters || {})) {
            params2.set(key, `eq.${String(value)}`);
          }
          targetUrl = `${supabaseUrl}/rest/v1/${table}?${params2.toString()}`;
          fetchOptions = {
            method: "PATCH",
            headers: { ...headers, "Prefer": "return=representation" },
            body: JSON.stringify(body.update)
          };
        } else {
          const params2 = new URLSearchParams();
          params2.set("select", select);
          if (client_id && !filters.client_id) params2.set("client_id", `eq.${client_id}`);
          for (const [key, value] of Object.entries(filters)) {
            params2.set(key, value);
          }
          if (order) params2.set("order", order);
          if (limit) params2.set("limit", String(limit));
          if (offset) params2.set("offset", String(offset));
          targetUrl = `${supabaseUrl}/rest/v1/${table}?${params2.toString()}`;
          fetchOptions = { method: "GET", headers };
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1e4);
        try {
          const resp = await fetch(targetUrl, { ...fetchOptions, signal: controller.signal });
          clearTimeout(timeout);
          const data = await resp.json();
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: resp.status
          });
        } catch (queryErr) {
          clearTimeout(timeout);
          const isTimeout = queryErr instanceof Error && queryErr.name === "AbortError";
          return new Response(JSON.stringify({ error: isTimeout ? "query_timeout" : "query_error" }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      if (path === "/cdr-stats") {
        const body = await request.json();
        const { client_id: rawClientId = "credismart", query_type, params = {} } = body;
        const client_id = normalizeClientId(rawClientId) || "credismart";
        const supabaseUrl = env.SUPABASE_URL;
        const cdrKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
        const headers = {
          "Content-Type": "application/json",
          "apikey": cdrKey,
          "Authorization": `Bearer ${cdrKey}`
        };
        try {
          let result = {};
          if (query_type === "annual_summary") {
            const resp = await fetch(
              `${supabaseUrl}/rest/v1/cdr_daily_metrics?select=fecha,total_llamadas,contactos_efectivos,tasa_contacto_pct,rpc_contactos,rpc_rate_pct,ptp_contactos,ptp_rate_pct&client_id=eq.${encodeURIComponent(client_id)}&order=fecha.asc`,
              { headers }
            );
            const rows = await resp.json();
            const byYear = {};
            for (const row of rows || []) {
              const year = row.fecha?.substring(0, 4);
              if (!year) continue;
              if (!byYear[year]) byYear[year] = { year, total_llamadas: 0, contactos_efectivos: 0, dias: 0, sum_tasa: 0 };
              byYear[year].total_llamadas += row.total_llamadas || 0;
              byYear[year].contactos_efectivos += row.contactos_efectivos || 0;
              byYear[year].dias += 1;
              byYear[year].sum_tasa += row.tasa_contacto_pct || 0;
            }
            result = {
              query_type,
              data: Object.values(byYear).map((y) => ({
                year: y.year,
                total_llamadas: y.total_llamadas,
                contactos_efectivos: y.contactos_efectivos,
                dias_con_datos: y.dias,
                tasa_contacto_promedio_pct: y.dias > 0 ? +(y.sum_tasa / y.dias).toFixed(2) : 0
              }))
            };
          } else if (query_type === "monthly_summary") {
            const year = params.year || (/* @__PURE__ */ new Date()).getFullYear();
            const resp = await fetch(
              `${supabaseUrl}/rest/v1/cdr_daily_metrics?select=fecha,total_llamadas,contactos_efectivos,tasa_contacto_pct,rpc_contactos,rpc_rate_pct,ptp_contactos,ptp_rate_pct&client_id=eq.${encodeURIComponent(client_id)}&fecha=gte.${year}-01-01&fecha=lte.${year}-12-31&order=fecha.asc`,
              { headers }
            );
            const rows = await resp.json();
            const byMonth = {};
            for (const row of rows || []) {
              const month = row.fecha?.substring(0, 7);
              if (!month) continue;
              if (!byMonth[month]) byMonth[month] = { month, total_llamadas: 0, contactos_efectivos: 0, dias: 0, sum_tasa: 0 };
              byMonth[month].total_llamadas += row.total_llamadas || 0;
              byMonth[month].contactos_efectivos += row.contactos_efectivos || 0;
              byMonth[month].dias += 1;
              byMonth[month].sum_tasa += row.tasa_contacto_pct || 0;
            }
            result = {
              query_type,
              year,
              data: Object.values(byMonth).map((m) => ({
                month: m.month,
                total_llamadas: m.total_llamadas,
                contactos_efectivos: m.contactos_efectivos,
                dias_con_datos: m.dias,
                tasa_contacto_promedio_pct: m.dias > 0 ? +(m.sum_tasa / m.dias).toFixed(2) : 0
              }))
            };
          } else if (query_type === "date_range") {
            const { from_date, to_date } = params;
            if (!from_date || !to_date) {
              return new Response(JSON.stringify({ error: "from_date y to_date son requeridos" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
            const resp = await fetch(
              `${supabaseUrl}/rest/v1/cdr_daily_metrics?select=fecha,total_llamadas,contactos_efectivos,tasa_contacto_pct,aht_minutos,rpc_contactos,rpc_rate_pct,ptp_contactos,ptp_rate_pct&client_id=eq.${encodeURIComponent(client_id)}&fecha=gte.${from_date}&fecha=lte.${to_date}&order=fecha.asc`,
              { headers }
            );
            const rows = await resp.json();
            let total_llamadas = 0, contactos_efectivos = 0, sum_tasa = 0, sum_aht = 0, dias = 0;
            for (const row of rows || []) {
              total_llamadas += row.total_llamadas || 0;
              contactos_efectivos += row.contactos_efectivos || 0;
              sum_tasa += row.tasa_contacto_pct || 0;
              sum_aht += row.aht_minutos || 0;
              dias += 1;
            }
            result = {
              query_type,
              from_date,
              to_date,
              dias_con_datos: dias,
              total_llamadas,
              contactos_efectivos,
              tasa_contacto_promedio_pct: dias > 0 ? +(sum_tasa / dias).toFixed(2) : 0,
              aht_promedio_minutos: dias > 0 ? +(sum_aht / dias).toFixed(2) : 0,
              daily: rows
            };
          } else if (query_type === "top_agents") {
            const limit = params.limit || 10;
            const order = params.order === "asc" ? "avg_llamadas.asc" : "avg_llamadas.desc";
            const resp = await fetch(
              `${supabaseUrl}/rest/v1/cdr_daily_metrics?select=fecha,agent_name,total_llamadas,contactos_efectivos&client_id=eq.${encodeURIComponent(client_id)}&order=fecha.desc&limit=3000`,
              { headers }
            );
            const rows = await resp.json();
            const byAgent = {};
            for (const row of rows || []) {
              const agent = row.agent_name || "Desconocido";
              if (!byAgent[agent]) byAgent[agent] = { agent_name: agent, total_llamadas: 0, contactos_efectivos: 0, dias: 0 };
              byAgent[agent].total_llamadas += row.total_llamadas || 0;
              byAgent[agent].contactos_efectivos += row.contactos_efectivos || 0;
              byAgent[agent].dias += 1;
            }
            const agents = Object.values(byAgent).map((a) => ({
              agent_name: a.agent_name,
              total_llamadas: a.total_llamadas,
              contactos_efectivos: a.contactos_efectivos,
              avg_llamadas_por_dia: a.dias > 0 ? +(a.total_llamadas / a.dias).toFixed(1) : 0
            }));
            agents.sort((a, b) => params.order === "asc" ? a.avg_llamadas_por_dia - b.avg_llamadas_por_dia : b.avg_llamadas_por_dia - a.avg_llamadas_por_dia);
            result = { query_type, data: agents.slice(0, limit) };
          } else if (query_type === "daily_trend") {
            const days = params.days || 30;
            const fromDate = /* @__PURE__ */ new Date();
            fromDate.setDate(fromDate.getDate() - days);
            const fromStr = fromDate.toISOString().substring(0, 10);
            const resp = await fetch(
              `${supabaseUrl}/rest/v1/cdr_daily_metrics?select=fecha,total_llamadas,contactos_efectivos,tasa_contacto_pct,aht_minutos,rpc_contactos,rpc_rate_pct,ptp_contactos,ptp_rate_pct&client_id=eq.${encodeURIComponent(client_id)}&fecha=gte.${fromStr}&order=fecha.desc&limit=${days}`,
              { headers }
            );
            const rows = await resp.json();
            result = { query_type, days, data: rows };
          } else if (query_type === "year_over_year") {
            let aggregateRows = function(rows) {
              let total_llamadas = 0, contactos_efectivos = 0, sum_tasa = 0, sum_aht = 0, dias = 0;
              for (const row of rows || []) {
                total_llamadas += row.total_llamadas || 0;
                contactos_efectivos += row.contactos_efectivos || 0;
                sum_tasa += row.tasa_contacto_pct || 0;
                sum_aht += row.aht_minutos || 0;
                dias += 1;
              }
              return {
                total_llamadas,
                contactos_efectivos,
                tasa_contacto_promedio_pct: dias > 0 ? +(sum_tasa / dias).toFixed(2) : 0,
                aht_promedio_minutos: dias > 0 ? +(sum_aht / dias).toFixed(2) : 0,
                dias_con_datos: dias
              };
            }, delta = function(curr, prev) {
              if (!prev || prev === 0) return null;
              return +((curr - prev) / prev * 100).toFixed(1);
            };
            __name(aggregateRows, "aggregateRows");
            __name(delta, "delta");
            const { from_date, to_date } = params;
            if (!from_date || !to_date) {
              return new Response(JSON.stringify({ error: "from_date y to_date son requeridos para year_over_year" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
            const prevFrom = new Date(from_date);
            const prevTo = new Date(to_date);
            prevFrom.setFullYear(prevFrom.getFullYear() - 1);
            prevTo.setFullYear(prevTo.getFullYear() - 1);
            const prevFromStr = prevFrom.toISOString().substring(0, 10);
            const prevToStr = prevTo.toISOString().substring(0, 10);
            const [respActual, respAnterior] = await Promise.all([
              fetch(`${supabaseUrl}/rest/v1/cdr_daily_metrics?select=fecha,total_llamadas,contactos_efectivos,tasa_contacto_pct,aht_minutos,rpc_contactos,rpc_rate_pct,ptp_contactos,ptp_rate_pct&client_id=eq.${encodeURIComponent(client_id)}&fecha=gte.${from_date}&fecha=lte.${to_date}&order=fecha.asc`, { headers }),
              fetch(`${supabaseUrl}/rest/v1/cdr_daily_metrics?select=fecha,total_llamadas,contactos_efectivos,tasa_contacto_pct,aht_minutos,rpc_contactos,rpc_rate_pct,ptp_contactos,ptp_rate_pct&client_id=eq.${encodeURIComponent(client_id)}&fecha=gte.${prevFromStr}&fecha=lte.${prevToStr}&order=fecha.asc`, { headers })
            ]);
            const [rowsActual, rowsAnterior] = await Promise.all([respActual.json(), respAnterior.json()]);
            const actual = aggregateRows(rowsActual);
            const anterior = aggregateRows(rowsAnterior);
            result = {
              query_type: "year_over_year",
              periodo_actual: { from: from_date, to: to_date, ...actual },
              periodo_anterior: { from: prevFromStr, to: prevToStr, ...anterior },
              variacion_yoy: {
                total_llamadas_pct: delta(actual.total_llamadas, anterior.total_llamadas),
                contactos_efectivos_pct: delta(actual.contactos_efectivos, anterior.contactos_efectivos),
                tasa_contacto_pp: anterior.tasa_contacto_promedio_pct > 0 ? +(actual.tasa_contacto_promedio_pct - anterior.tasa_contacto_promedio_pct).toFixed(2) : null,
                aht_pct: delta(actual.aht_promedio_minutos, anterior.aht_promedio_minutos)
              },
              nota: rowsAnterior.length === 0 ? "Sin datos para el per\xEDodo anterior \u2014 puede que ese rango no tenga registros en CDR" : `Comparativa basada en ${actual.dias_con_datos} d\xEDas actuales vs ${anterior.dias_con_datos} d\xEDas del a\xF1o anterior`
            };
          } else {
            return new Response(JSON.stringify({ error: `query_type desconocido: ${query_type}` }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (cdrErr) {
          return new Response(JSON.stringify({ error: "cdr_stats_error", detail: cdrErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      if (path === "/notify-alert") {
        try {
          const body = await request.json();
          const { title, description, severity, metric, actual_value, threshold, client_id } = body;
          const emoji = severity === "critical" ? "\u{1F534}" : severity === "warning" ? "\u{1F7E1}" : "\u{1F535}";
          const severityLabel = severity === "critical" ? "CR\xCDTICO" : severity === "warning" ? "ADVERTENCIA" : "INFO";
          const msg = `${emoji} *WeKall Intelligence \u2014 Alerta ${severityLabel}*

*${title}*
${description}

\u{1F4CA} M\xE9trica: ${metric}
Valor actual: ${actual_value} | Umbral: ${threshold}

_Enviado desde WeIntelligence \xB7 ${(/* @__PURE__ */ new Date()).toLocaleString("es-CO", { timeZone: "America/Bogota" })}_`;
          const recipient = env.ALERT_RECIPIENT || "573102335928@s.whatsapp.net";
          const supabaseUrl = env.SUPABASE_URL;
          const supabaseKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
          const notifResp = await fetch(`${supabaseUrl}/rest/v1/alert_notifications`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
              "apikey": supabaseKey,
              "Prefer": "return=minimal"
            },
            body: JSON.stringify({
              client_id,
              severity,
              metric,
              title,
              message: msg,
              recipient,
              status: "pending",
              created_at: (/* @__PURE__ */ new Date()).toISOString()
            })
          });
          return new Response(JSON.stringify({
            ok: true,
            message: "Notificaci\xF3n encolada",
            recipient,
            supabase_status: notifResp.status
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (notifErr) {
          return new Response(JSON.stringify({ error: "notify_error", detail: notifErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      if (path === "/load-data") {
        try {
          const body = await request.json();
          const { table, rows, token } = body;
          const LOAD_TOKEN = env.LOAD_TOKEN || "wekall-load-2026";
          if (token !== LOAD_TOKEN) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          const ALLOWED_TABLES = ["cdr_campaign_metrics", "agent_daily_metrics", "cdr_hourly_metrics", "cdr_daily_metrics", "industry_benchmarks", "financial_results"];
          if (!ALLOWED_TABLES.includes(table)) {
            return new Response(JSON.stringify({ error: `Tabla no permitida: ${table}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return new Response(JSON.stringify({ error: "rows requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          const serviceKey = env.SUPABASE_SERVICE_KEY;
          const supabaseUrl = env.SUPABASE_URL;
          const onConflict = body.on_conflict || null;
          const tableUrl = onConflict ? `${supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}` : `${supabaseUrl}/rest/v1/${table}`;
          const insertResp = await fetch(tableUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": serviceKey,
              "Authorization": `Bearer ${serviceKey}`,
              "Prefer": "resolution=merge-duplicates,return=minimal"
            },
            body: JSON.stringify(rows)
          });
          const text = await insertResp.text();
          return new Response(JSON.stringify({ ok: insertResp.ok, status: insertResp.status, rows: rows.length, detail: text.slice(0, 200) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: insertResp.ok ? 200 : insertResp.status
          });
        } catch (loadErr) {
          return new Response(JSON.stringify({ error: "load_error", detail: loadErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      if (path === "/delete-where") {
        try {
          const body = await request.json();
          const { table, token, filters } = body;
          const LOAD_TOKEN = env.LOAD_TOKEN || "wekall-load-2026";
          if (token !== LOAD_TOKEN) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          const ALLOWED = ["cdr_campaign_metrics", "cdr_daily_metrics", "cdr_hourly_metrics", "client_config", "client_labor_costs", "client_branding", "app_users"];
          if (!ALLOWED.includes(table)) return new Response(JSON.stringify({ error: "tabla no permitida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          const serviceKey = env.SUPABASE_SERVICE_KEY;
          const supabaseUrl = env.SUPABASE_URL;
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(filters || {})) params.set(k, v);
          const delResp = await fetch(`${supabaseUrl}/rest/v1/${table}?${params.toString()}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}`, "Prefer": "return=minimal" }
          });
          const txt = await delResp.text();
          return new Response(JSON.stringify({ ok: delResp.ok, status: delResp.status, detail: txt.slice(0, 200) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      if (path === "/update-where") {
        try {
          const body = await request.json();
          const { table, token, filters, data } = body;
          const LOAD_TOKEN = env.LOAD_TOKEN || "wekall-load-2026";
          if (token !== LOAD_TOKEN) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          const ALLOWED = ["cdr_campaign_metrics", "cdr_daily_metrics", "cdr_hourly_metrics", "client_config", "app_users", "client_branding", "client_labor_costs", "client_kpi_targets"];
          if (!ALLOWED.includes(table)) return new Response(JSON.stringify({ error: "tabla no permitida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          const serviceKey = env.SUPABASE_SERVICE_KEY;
          const supabaseUrl = env.SUPABASE_URL;
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(filters || {})) params.set(k, v);
          const updResp = await fetch(`${supabaseUrl}/rest/v1/${table}?${params.toString()}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}`, "Prefer": "return=minimal" },
            body: JSON.stringify(data)
          });
          const txt = await updResp.text();
          return new Response(JSON.stringify({ ok: updResp.ok, status: updResp.status, detail: txt.slice(0, 200) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      if (path === "/vicky") {
        try {
          const body = await request.json();
          const { question, client_id: rawClientId = "credismart", history = [], agent_context = null } = body;
          if (!question) return new Response(JSON.stringify({ error: "question requerida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          const client_id = normalizeClientId(rawClientId) || "credismart";
          const getClientIdVariants = /* @__PURE__ */ __name((normalizedId) => {
            const variants = [normalizedId];
            for (const [alias, target] of Object.entries(CLIENT_ID_ALIASES)) {
              if (target === normalizedId && !variants.includes(alias)) {
                variants.push(alias);
              }
            }
            return variants;
          }, "getClientIdVariants");
          const clientIdVariants = getClientIdVariants(client_id);
          const supabaseUrl = env.SUPABASE_URL;
          const svcKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
          const supaHeaders = { "Content-Type": "application/json", "apikey": svcKey, "Authorization": `Bearer ${svcKey}` };
          const q = question.toLowerCase();
          const INTENTS = {
            agents: ["agente", "agentes", "equipo", "csat", "fcr", "coaching", "mejor agente", "peor agente", "ranking de agente", "top 10", "top diez", "top agente", "volumen de llamada", "llamadas por agente", "qui\xE9n llama m\xE1s", "qui\xE9n tiene la", "qui\xE9n tiene el", "tasa de promesa por agente", "promesa m\xE1s alta por agente", "cu\xE1les agentes", "cu\xE1l agente", "qu\xE9 agentes"],
            campaigns: ["campa\xF1a", "campa\xF1as", "rendimiento de campa", "mejor campa\xF1a", "peor campa\xF1a", "por campa\xF1a", "desglose campa\xF1a"],
            daily_ops: ["ayer", "hoy", "\xFAltimo d\xEDa", "tasa de contacto", "llamadas hoy", "c\xF3mo estuvo", "operaci\xF3n hoy", "qu\xE9 d\xEDas", "qu\xE9 d\xEDa", "d\xEDas est\xE1", "d\xEDas estuvo", "d\xEDas funciona", "mejor d\xEDa", "peor d\xEDa"],
            monthly_trend: ["mes", "mensual", "mes a mes", "promedio mensual", "este mes", "\xFAltimo mes", "por mes", "cada mes"],
            annual_trend: ["a\xF1o", "anual", "yoy", "a\xF1o pasado", "hace un a\xF1o", "2024", "2025", "mismo per\xEDodo"],
            costs: ["costo", "precio", "cu\xE1nto cuesta", "n\xF3mina", "roi", "ahorro", "gasto"],
            benchmarks: ["benchmark", "industria", "comparado", "sector", "latam", "competencia"],
            alerts: ["alerta", "riesgo", "anomal\xEDa", "ca\xEDda", "problema", "rojo"],
            strategy: ["deber\xEDa", "recomendaci\xF3n", "mejorar", "escalar", "oportunidad", "qu\xE9 har\xEDas"],
            transcriptions: ["dicen los clientes", "qu\xE9 dicen los clientes", "voz del cliente", "objecion", "objeci\xF3n", "quejas de clientes", "qu\xE9 ha pasado con los clientes", "frases de clientes", "lo que dicen los clientes", "clientes mencionan", "han expresado", "qu\xE9 pas\xF3 relevante", "relevante de acuerdo a lo que dicen", "situaciones en las llamadas", "por qu\xE9 no", "recuperando cartera", "no pagan", "clientes no pagan"]
          };
          const detectedIntents = Object.entries(INTENTS).filter(([, kws]) => kws.some((kw) => q.includes(kw))).map(([name]) => name);
          if (detectedIntents.length === 0) detectedIntents.push("daily_ops");
          const intent = detectedIntents[0];
          const hasIntent = /* @__PURE__ */ __name((name) => detectedIntents.includes(name), "hasIntent");
          let contextData = "";
          const fetchSupa = /* @__PURE__ */ __name(async (path2) => {
            const r = await fetch(`${supabaseUrl}/rest/v1/${path2}`, { headers: supaHeaders });
            return r.json();
          }, "fetchSupa");
          const yr = (/* @__PURE__ */ new Date()).getFullYear();
          const twoYearsAgo = /* @__PURE__ */ new Date();
          twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24);
          const twoYearsAgoStr = twoYearsAgo.toISOString().substring(0, 10);
          const needsDaily = hasIntent("daily_ops") || hasIntent("alerts") || hasIntent("strategy") || hasIntent("agents");
          const needsMonthly = hasIntent("monthly_trend") || hasIntent("strategy") || hasIntent("annual_trend");
          const needsBmarks = hasIntent("benchmarks") || hasIntent("strategy");
          const [configs, dailyRows, monthlyRows, bmarkRows] = await Promise.all([
            fetchSupa(`client_config?client_id=eq.${encodeURIComponent(client_id)}&limit=1`),
            needsDaily ? fetchSupa(`cdr_daily_metrics?client_id=eq.${encodeURIComponent(client_id)}&order=fecha.desc&limit=7&select=fecha,total_llamadas,contactos_efectivos,tasa_contacto_pct`) : Promise.resolve([]),
            needsMonthly ? fetchSupa(`cdr_daily_metrics?client_id=eq.${encodeURIComponent(client_id)}&fecha=gte.${twoYearsAgoStr}&select=fecha,total_llamadas,tasa_contacto_pct&order=fecha.asc`) : Promise.resolve([]),
            needsBmarks ? fetchSupa(`industry_benchmarks?industry=eq.cobranza&limit=10`) : Promise.resolve([])
          ]);
          const cfg = Array.isArray(configs) ? configs[0] : null;
          const clientName = cfg?.client_name || client_id;
          const industry = cfg?.industry || "cobranza";
          const country = cfg?.country || "colombia";
          if (needsDaily && Array.isArray(dailyRows) && dailyRows.length > 0) {
            contextData += `
CDR \xDAltimos 7 d\xEDas:
${dailyRows.map((r) => `${r.fecha}: ${(r.total_llamadas || 0).toLocaleString()} llamadas | ${r.tasa_contacto_pct || 0}% contacto`).join("\n")}`;
          }
          if (needsMonthly && Array.isArray(monthlyRows) && monthlyRows.length > 0) {
            const byMonth = {};
            for (const r of monthlyRows) {
              const m = r.fecha?.substring(0, 7);
              if (!m) continue;
              if (!byMonth[m]) byMonth[m] = { total: 0, sum_tasa: 0, dias: 0 };
              byMonth[m].total += r.total_llamadas || 0;
              byMonth[m].sum_tasa += r.tasa_contacto_pct || 0;
              byMonth[m].dias++;
            }
            const months = Object.entries(byMonth).slice(-24);
            contextData += `
Resumen \xFAltimos ${months.length} meses (datos desde ${months[0]?.[0] || "N/A"}):
${months.map(([m, d]) => `${m}: ${d.total.toLocaleString()} llamadas | ${d.dias > 0 ? +(d.sum_tasa / d.dias).toFixed(1) : 0}% contacto`).join("\n")}`;
          }
          if (needsBmarks && Array.isArray(bmarkRows) && bmarkRows.length > 0) {
            contextData += `
Benchmarks COPC LATAM (cobranza):
${bmarkRows.map((b) => `${b.metric_name}: P25=${b.p25} P50=${b.p50} P75=${b.p75}`).join("\n")}`;
          }
          if (hasIntent("transcriptions")) {
            try {
              const embedResp = await fetch("https://api.openai.com/v1/embeddings", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.OPENAI_API_KEY}` },
                body: JSON.stringify({ model: "text-embedding-3-small", input: question })
              });
              const embedData = await embedResp.json();
              const queryEmbedding = embedData.data?.[0]?.embedding;
              if (queryEmbedding) {
                const searchResp = await fetch(`${supabaseUrl}/rest/v1/rpc/search_transcriptions`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "apikey": svcKey, "Authorization": `Bearer ${svcKey}` },
                  body: JSON.stringify({ query_embedding: queryEmbedding, match_count: 8, client_id_filter: client_id })
                });
                const ragResults = await searchResp.json();
                if (Array.isArray(ragResults) && ragResults.length > 0) {
                  contextData += `
TRANSCRIPCIONES REALES RELEVANTES (${ragResults.length} llamadas encontradas por b\xFAsqueda sem\xE1ntica):
`;
                  ragResults.forEach((r, i) => {
                    contextData += `
[Llamada ${i + 1} \u2014 Agente: ${r.agent_name || r.agent_id} | Fecha: ${r.call_date} | Campa\xF1a: ${r.campaign || "N/A"}]
`;
                    contextData += r.summary || (r.transcript ? r.transcript.substring(0, 400) + "..." : "(sin transcript)");
                    contextData += "\n";
                  });
                  contextData += `
Instrucci\xF3n: Analiza estos extractos reales y responde la pregunta con insights concretos. Menciona patrones, frases recurrentes y situaciones relevantes que aparecen en las llamadas. NO generalices \u2014 usa lo que est\xE1 en las transcripciones.`;
                } else {
                  const orConditions = clientIdVariants.map((v) => `client_id.eq.${v}`).join(",");
                  const textRows = await fetchSupa(`transcriptions?or=(${orConditions})&select=agent_name,call_date,campaign,summary,transcript&order=call_date.desc&limit=10`);
                  if (Array.isArray(textRows) && textRows.length > 0) {
                    contextData += `
TRANSCRIPCIONES RECIENTES (${textRows.length} m\xE1s recientes):
`;
                    textRows.forEach((r, i) => {
                      contextData += `
[Agente: ${r.agent_name} | ${r.call_date} | ${r.campaign}]
`;
                      contextData += r.summary || (r.transcript ? r.transcript.substring(0, 300) + "..." : "");
                      contextData += "\n";
                    });
                  } else {
                    contextData += `
No se encontraron transcripciones disponibles para ${client_id} en este momento.`;
                  }
                }
              }
            } catch (e) {
              contextData += `
Error consultando transcripciones: ${e.message}`;
            }
          }
          if (hasIntent("campaigns")) {
            try {
              const campRows = await fetchSupa(`cdr_campaign_metrics?client_id=eq.${encodeURIComponent(rawClientId || "credismart")}&order=fecha.desc&limit=1000&select=campaign_id,total_llamadas,contactos_efectivos,tasa_contacto_pct`);
              if (Array.isArray(campRows) && campRows.length > 0) {
                const rows = campRows;
                if (rows.length === 0) {
                  contextData += `
Datos de campa\xF1as no disponibles para el cliente ${rawClientId || client_id}.`;
                } else {
                  const byCamp = {};
                  for (const r of rows) {
                    const c = r.campaign_id || "sin_campana";
                    if (!byCamp[c]) byCamp[c] = { llamadas: 0, contactos: 0, sum_tasa: 0, dias: 0 };
                    byCamp[c].llamadas += r.total_llamadas || 0;
                    byCamp[c].contactos += r.contactos_efectivos || 0;
                    byCamp[c].sum_tasa += r.tasa_contacto_pct || 0;
                    byCamp[c].dias++;
                  }
                  const camps = Object.entries(byCamp).map(([c, d]) => ({
                    id: c,
                    llamadas: d.llamadas,
                    contactos: d.contactos,
                    tasa: d.dias > 0 ? +(d.sum_tasa / d.dias).toFixed(1) : 0,
                    pct: 0
                  }));
                  const totalLlamadas = camps.reduce((s, c) => s + c.llamadas, 0);
                  camps.forEach((c) => c.pct = totalLlamadas > 0 ? +(c.llamadas / totalLlamadas * 100).toFixed(1) : 0);
                  camps.sort((a, b) => b.tasa - a.tasa);
                  contextData += `
RENDIMIENTO POR CAMPA\xD1A (datos reales CDR \u2014 ${totalLlamadas.toLocaleString()} llamadas totales):
`;
                  contextData += camps.map((c, i) => `${i + 1}. ${c.id}: ${c.llamadas.toLocaleString()} llamadas (${c.pct}%) | ${c.contactos.toLocaleString()} contactos | ${c.tasa}% tasa contacto`).join("\n");
                  const best = camps[0];
                  const worst = camps[camps.length - 1];
                  if (best && worst && best.id !== worst.id) {
                    contextData += `
Insight: ${best.id} tiene la MEJOR tasa de contacto (${best.tasa}%). ${worst.id} tiene la peor (${worst.tasa}%).`;
                  }
                }
              }
            } catch (e) {
              contextData += `
Campa\xF1as: error consultando datos (${e.message})`;
            }
          }
          if (hasIntent("agents")) {
            const agQueryKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
            const agTargetUrl = `${env.SUPABASE_URL}/rest/v1/agents_performance?client_id=eq.${encodeURIComponent(rawClientId || "credismart")}&select=agent_name,llamadas_total,contactos,promesas,tasa_contacto,tasa_promesa,csat,aht_segundos&limit=500`;
            const agFetchResp = await fetch(agTargetUrl, {
              method: "GET",
              headers: { "Content-Type": "application/json", "apikey": agQueryKey, "Authorization": `Bearer ${agQueryKey}` }
            });
            const agentRows = await agFetchResp.json();
            if (Array.isArray(agentRows) && agentRows.length > 0) {
              const agMap = {};
              for (const a of agentRows) {
                const name = a.agent_name;
                if (!name) continue;
                if (!agMap[name]) agMap[name] = { name, llamadas: 0, contactos: 0, promesas: 0, csat_sum: 0, tasa_c_sum: 0, tasa_p_sum: 0, dias: 0 };
                agMap[name].llamadas += a.llamadas_total || 0;
                agMap[name].contactos += a.contactos || 0;
                agMap[name].promesas += a.promesas || 0;
                agMap[name].csat_sum += a.csat || 0;
                agMap[name].tasa_c_sum += a.tasa_contacto || 0;
                agMap[name].tasa_p_sum += a.tasa_promesa || 0;
                agMap[name].dias++;
              }
              const agList = Object.values(agMap).map((a) => ({
                name: a.name,
                llamadas: a.llamadas,
                contactos: a.contactos,
                promesas: a.promesas,
                csat: a.dias > 0 ? +(a.csat_sum / a.dias).toFixed(2) : 0,
                tasa_contacto: a.dias > 0 ? +(a.tasa_c_sum / a.dias).toFixed(1) : 0,
                tasa_promesa: a.dias > 0 ? +(a.tasa_p_sum / a.dias).toFixed(1) : 0
              }));
              const totalAgentes = agList.length;
              const avgLlamadas = agList.length > 0 ? Math.round(agList.reduce((s, a) => s + a.llamadas, 0) / agList.length) : 0;
              const porVolumen = q.includes("volumen") || q.includes("llamadas") || q.includes("top 10") || q.includes("top diez") || q.includes("m\xE1s llama") || q.includes("mayor cantidad");
              const porCsat = q.includes("csat") || q.includes("calidad") || q.includes("satisfacci\xF3n") || q.includes("mejor agente") || q.includes("peor agente");
              const porPromesa = q.includes("promesa") || q.includes("compromi") || q.includes("pago");
              if (porVolumen || !porCsat && !porPromesa) {
                const byVolume = [...agList].sort((a, b) => b.llamadas - a.llamadas);
                const top10 = byVolume.slice(0, 10);
                const bottom5 = byVolume.slice(-5);
                contextData += `
TOP 10 AGENTES POR VOLUMEN DE LLAMADAS (${totalAgentes} agentes, datos reales acumulados):
`;
                contextData += top10.map((a, i) => `${i + 1}. ${a.name}: ${a.llamadas.toLocaleString()} llamadas | ${a.contactos.toLocaleString()} contactos | ${a.tasa_contacto}% contacto | ${a.tasa_promesa}% promesa | CSAT ${a.csat}/5`).join("\n");
                contextData += `

Promedio del equipo: ${avgLlamadas.toLocaleString()} llamadas/agente (per\xEDodo completo)`;
                contextData += `

Bottom 5 (menor volumen):
${bottom5.map((a, i) => `${i + 1}. ${a.name}: ${a.llamadas.toLocaleString()} llamadas | CSAT ${a.csat}/5`).join("\n")}`;
              }
              if (porCsat) {
                const byCsat = [...agList].sort((a, b) => b.csat - a.csat);
                const top10c = byCsat.slice(0, 10);
                const bottom5c = byCsat.slice(-5);
                contextData += `
TOP 10 AGENTES POR CSAT (${totalAgentes} agentes):
`;
                contextData += top10c.map((a, i) => `${i + 1}. ${a.name}: CSAT ${a.csat}/5 | ${a.llamadas.toLocaleString()} llamadas | ${a.tasa_promesa}% promesa`).join("\n");
                contextData += `

Agentes con menor CSAT (necesitan coaching):
${bottom5c.map((a) => `- ${a.name}: CSAT ${a.csat}/5 | ${a.llamadas.toLocaleString()} llamadas`).join("\n")}`;
              }
              if (porPromesa) {
                const byPromesa = [...agList].sort((a, b) => b.tasa_promesa - a.tasa_promesa);
                contextData += `
TOP 10 AGENTES POR TASA DE PROMESA:
`;
                contextData += byPromesa.slice(0, 10).map((a, i) => `${i + 1}. ${a.name}: ${a.tasa_promesa}% promesa | ${a.llamadas.toLocaleString()} llamadas | CSAT ${a.csat}/5`).join("\n");
              }
              if (agent_context) {
                contextData += `

KPIs del equipo (datos en tiempo real):
`;
                contextData += `CSAT promedio: ${(agent_context.csat_promedio || 0).toFixed(2)}/5 | FCR: ${(agent_context.fcr_promedio || 0).toFixed(1)}% | Agentes activos: ${agent_context.agentes_activos} | Ocupaci\xF3n: ${(agent_context.ocupacion_promedio || 0).toFixed(1)}%`;
              }
            } else {
              contextData += `
Datos de agentes no disponibles en este momento. La tabla agents_performance no retorn\xF3 registros para el cliente ${client_id}.`;
              if (agent_context) {
                contextData += `

KPIs generales del equipo (datos del frontend):
CSAT promedio: ${(agent_context.csat_promedio || 0).toFixed(2)}/5 | FCR: ${(agent_context.fcr_promedio || 0).toFixed(1)}% | Agentes activos: ${agent_context.agentes_activos}`;
              }
            }
          }
          if (hasIntent("costs")) {
            const costData = await fetchSupa(`cdr_daily_metrics?client_id=eq.${encodeURIComponent(client_id)}&order=fecha.desc&limit=30&select=fecha,total_llamadas,contactos_efectivos`);
            if (Array.isArray(costData) && costData.length > 0) {
              const totalLlamadas = costData.reduce((s, r) => s + (r.total_llamadas || 0), 0);
              const totalContactos = costData.reduce((s, r) => s + (r.contactos_efectivos || 0), 0);
              const costoAgente = cfg?.costo_agente_mes || 3e6;
              const agentes = cfg?.agentes_activos || 81;
              const costoDia = costoAgente * agentes / 22;
              const costoLlamada = totalLlamadas > 0 ? Math.round(costoDia * 30 / totalLlamadas) : 0;
              const costoContacto = totalContactos > 0 ? Math.round(costoDia * 30 / totalContactos) : 0;
              contextData += `
Datos de costos (30 d\xEDas):
- Agentes activos: ${agentes} | Costo/agente/mes: COP $${costoAgente.toLocaleString()}
- Total n\xF3mina: COP $${(costoAgente * agentes).toLocaleString()}/mes
- Llamadas procesadas: ${totalLlamadas.toLocaleString()} | Contactos: ${totalContactos.toLocaleString()}
- Costo estimado por llamada: COP $${costoLlamada.toLocaleString()}
- Costo estimado por contacto efectivo: COP $${costoContacto.toLocaleString()}`;
            }
          }
          const paisesOp = cfg?.paises_operacion ? Array.isArray(cfg.paises_operacion) ? cfg.paises_operacion.join(", ") : cfg.paises_operacion : cfg?.country || "Colombia";
          const safeHistory = (Array.isArray(history) ? history : []).slice(-6).map((m) => ({
            role: m.role,
            content: typeof m.content === "string" && m.content.length > 500 ? m.content.substring(0, 500) + "\u2026" : m.content || ""
          }));
          const historialContexto = safeHistory.length > 0 ? `
CONTEXTO DE LA CONVERSACI\xD3N ANTERIOR (\xFAltimos ${Math.floor(safeHistory.length / 2)} turnos):
` + safeHistory.map((m) => `${m.role === "user" ? "CEO" : "Vicky"}: ${m.content}`).join("\n") + "\n--- FIN DEL CONTEXTO ANTERIOR ---\n" : "";
          const systemPrompt = `Eres Vicky Insights, IA anal\xEDtica de WeKall Intelligence para ${clientName}.
Industria: ${industry} | Pa\xEDs(es) de operaci\xF3n: ${paisesOp}
Fecha actual: ${(/* @__PURE__ */ new Date()).toISOString().substring(0, 10)}
Datos CDR disponibles: enero 2024 \u2013 abril 2026 (todos los pa\xEDses y campa\xF1as del cliente activo)
IMPORTANTE: El CDR incluye TODAS las campa\xF1as del cliente activo. Nunca asumas qu\xE9 pa\xEDses o campa\xF1as opera el cliente \u2014 consult\xE1 los datos reales del CDR.
${contextData ? `
DATOS CONSULTADOS PARA ESTA PREGUNTA:
${contextData}` : "\nNota: los datos espec\xEDficos para esta pregunta no est\xE1n disponibles en el CDR."}

${industry === "fintech_pagos" ? `CONTEXTO DE LA OPERACI\xD3N (Bold - fintech pagos):
- Operaci\xF3n de servicio al cliente y soporte t\xE9cnico para usuarios de dat\xE1fonos, pasarela de pagos y cuenta digital
- M\xE9tricas clave: tasa de resoluci\xF3n en primera llamada (FCR), tiempo de resoluci\xF3n, CSAT, abandono
- La tasa de contacto del 46-50% es normal para inbound de servicio (no outbound de cobranza)
- Tasa de abandono del 44.6% es alta \u2014 oportunidad de mejora en tiempos de espera
- NO usar estimativos de recaudo \u2014 Bold no es cartera, es servicio al cliente` : `ESTIMATIVOS FINANCIEROS (cuando no hay datos reales de recaudo):
- Cuota promedio inferida de transcripciones: COP $160,000 (mediana) / $278,000 (promedio)
- Recaudo estimado/d\xEDa: ~COP $267M (2,780 promesas \xD7 $160k \xD7 60% cumplimiento)
- Recaudo estimado/mes: ~COP $5,874M (\xD7 22 d\xEDas h\xE1biles)
- IMPORTANTE: cuando uses estos estimativos, incluye SIEMPRE al final: "\u26A0\uFE0F An\xE1lisis basado en estimativos \u2014 inferidos de transcripciones y supuestos de industria, no de datos contables. Margen de error puede ser significativo. Para precisi\xF3n, conectar el sistema de cobranza a WeIntelligence."`}

CAPACIDAD DE GR\xC1FICOS \u2014 OBLIGATORIO:
Cuando el usuario diga "gr\xE1fico", "graf\xEDcame", "en barras", "en pie", "en l\xEDnea", "visualiza", "mu\xE9strame visualmente", DEBES generar el gr\xE1fico CON DATOS REALES.
NUNCA digas "no puedo generar gr\xE1ficos" \u2014 S\xCD PUEDES con este formato.
Al final de tu respuesta (despu\xE9s del an\xE1lisis en prosa), agrega en una sola l\xEDnea:
CHART_JSON:{"type":"bar-horizontal","title":"T\xEDtulo Descriptivo","labels":["Elemento1","Elemento2","Elemento3"],"datasets":[{"label":"M\xE9trica","data":[valor1,valor2,valor3],"color":"#818cf8"}],"unit":"unidad"}

GR\xC1FICOS CON DOBLE EJE Y (para m\xE9tricas con diferentes escalas):
Cuando combines m\xE9tricas con unidades diferentes (ej: llamadas vs %), usa datasets con unit espec\xEDfico:
CHART_JSON:{"type":"line","title":"Llamadas y Tasa de Contacto","labels":["Ene","Feb","Mar"],"datasets":[{"label":"Llamadas","data":[50000,60000,55000],"color":"#818cf8"},{"label":"Tasa Contacto","data":[15.5,18.2,16.8],"color":"#f59e0b","unit":"%"}],"unit":"llamadas"}
El sistema autom\xE1ticamente crear\xE1 un eje Y derecho para datasets con unit diferente al principal.

Tipos disponibles:
- "line" \u2192 tendencias temporales
- "bar" \u2192 comparaciones por per\xEDodo o categor\xEDa
- "bar-horizontal" \u2192 rankings (top agentes, campa\xF1as, etc.)
- "pie" \u2192 distribuciones proporcionales

El JSON debe ser v\xE1lido y en una sola l\xEDnea, precedido exactamente por "CHART_JSON:".
USA SOLO DATOS REALES del contextData de arriba \u2014 nunca inventes valores.

REGLA CR\xCDTICA PARA GR\xC1FICOS DE OBJECIONES:
- SOLO genera CHART_JSON de objeciones si tienes datos REALES de transcripciones analizadas
- Si NO hay transcripciones con objeciones clasificadas, NO generes el gr\xE1fico
- En su lugar, responde en prosa con an\xE1lisis basado en m\xE9tricas disponibles (tasa_contacto, tasa_promesa, fcr)
- Nunca uses datos de ejemplo o estimados \u2014 mejor no mostrar gr\xE1fico que mostrar datos inventados

REGLAS:
- Responde en prosa ejecutiva conversacional, sin listas ni headers ni bullets
- Usa los datos de arriba como base \u2014 no inventes cifras adicionales
- Si el dato pedido no est\xE1 arriba, dilo claramente sin inventar
- Da tu opini\xF3n con criterio: "En mi lectura..." "La prioridad es..."
- Nunca respondas con: "Por favor ind\xEDcame qu\xE9 m\xE9trica" si tienes datos disponibles
- S\xE9 directa: responde la pregunta antes de dar contexto
- Para an\xE1lisis financieros sin datos reales: usa los estimativos de arriba y siempre incluye la nota \u26A0\uFE0F
- Si hay historial de conversaci\xF3n: la pregunta actual puede referirse a datos ya mencionados. Usa el historial para responder sin pedir que repita el contexto.
- "Recaudo por agente" no est\xE1 en el CDR. Usa tasa_promesa \xD7 promesas como proxy: m\xE1s promesas + mayor tasa = mayor recaudo estimado.`;
          const systemPromptConHistorial = historialContexto ? systemPrompt + historialContexto : systemPrompt;
          const llmMessages = [
            { role: "system", content: systemPromptConHistorial },
            { role: "user", content: question }
          ];
          const llmKey = env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY;
          const useAnthropic = !env.OPENAI_API_KEY && !!env.ANTHROPIC_API_KEY;
          let finalContent = "";
          const openaiKey = env.OPENAI_API_KEY;
          if (openaiKey) {
            const llmCtrl = new AbortController();
            const llmTimeout = setTimeout(() => llmCtrl.abort(), 25e3);
            try {
              const or = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
                body: JSON.stringify({ model: "gpt-4o-mini", messages: llmMessages, max_tokens: 600, temperature: 0.3 }),
                signal: llmCtrl.signal
              });
              clearTimeout(llmTimeout);
              if (or.ok) {
                const od = await or.json();
                finalContent = od.choices?.[0]?.message?.content || "";
              } else {
                const errText = await or.text();
                finalContent = `Error consultando el modelo (${or.status}): ${errText.substring(0, 100)}`;
              }
            } catch (llmErr) {
              clearTimeout(llmTimeout);
              finalContent = llmErr.name === "AbortError" ? "La consulta tard\xF3 demasiado. Intenta de nuevo con una pregunta m\xE1s espec\xEDfica." : `Error LLM: ${llmErr.message}`;
            }
          } else if (env.ANTHROPIC_API_KEY) {
            const sysMsg = llmMessages.find((m) => m.role === "system");
            const userMsgs = llmMessages.filter((m) => m.role !== "system");
            const ar = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1e3, system: sysMsg?.content || "", messages: userMsgs })
            });
            if (ar.ok) {
              const ad = await ar.json();
              finalContent = ad.content?.[0]?.text || "";
            } else {
              finalContent = "No hay clave de LLM v\xE1lida disponible. Por favor verifica la configuraci\xF3n del Worker.";
            }
          } else {
            finalContent = "No hay clave de LLM configurada en el Worker.";
          }
          const safeContent = finalContent || "No pude generar una respuesta en este momento. Intenta de nuevo.";
          return new Response(JSON.stringify({
            id: `vicky-rag-${Date.now()}`,
            object: "chat.completion",
            model: "gpt-4o",
            intent_detected: intent,
            choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: safeContent } }]
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (vickyErr) {
          return new Response(JSON.stringify({ error: "vicky_rag_error", detail: vickyErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
      return new Response("Not found", { status: 404 });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
export {
  worker_default as default
};
