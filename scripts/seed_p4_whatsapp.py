#!/usr/bin/env python3
"""
P4 Seed Data: Insert WhatsApp transcriptions
Simulates customer interactions via WhatsApp channel
"""

import requests
import json
from datetime import datetime, timedelta
import random

SUPABASE_URL = "https://iszodrpublcnsyvtgjcg.supabase.co"
SERVICE_KEY = "sb_secret_cTZiXtV1sViVZB-lb1GEEw_-7HPRPqb"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# WhatsApp conversation templates
whatsapp_conversations = [
    {
        "agent_name": "Ana López",
        "campaign": "Servicio",
        "call_type": "support",
        "summary": "Cliente consulta sobre cambio de plan. Tono del cliente: positivo. Resultado: exitoso. Tema: Cambio de plan.",
        "transcript": "Cliente: Hola, quiero cambiar mi plan a uno con más datos\nAgente: Claro, con gusto te ayudo. ¿Cuántos GB necesitas aproximadamente?\nCliente: Unos 20GB estaría bien\nAgente: Perfecto, tenemos el plan Premium 20GB por $45/mes. ¿Te gustaría activarlo?\nCliente: Sí, adelante\nAgente: Listo, queda activo desde mañana. ¿Algo más en que pueda ayudarte?\nCliente: No, eso es todo. Gracias!",
        "channel": "whatsapp",
        "message_type": "inbound"
    },
    {
        "agent_name": "Carlos Ruiz",
        "campaign": "Cobranzas",
        "call_type": "collection",
        "summary": "Cliente promete pago de factura vencida. Tono del cliente: neutral. Resultado: exitoso. Tema: Promesa de pago.",
        "transcript": "Agente: Hola Juan, te contactamos por tu factura de $180 que está vencida desde hace 15 días\nCliente: Sí, disculpa, tuve un problema pero ya lo resuelvo\nAgente: Entiendo. ¿Cuándo podrías hacer el pago?\nCliente: El viernes sin falta\nAgente: Perfecto, te voy a agendar para el viernes. ¿Pagarás el monto completo?\nCliente: Sí, completo\nAgente: Excelente, te envío el link de pago por WhatsApp. Gracias!",
        "channel": "whatsapp",
        "message_type": "outbound"
    },
    {
        "agent_name": "María Fernández",
        "campaign": "Ventas",
        "call_type": "sale",
        "summary": "Cliente interesado en producto pero no cierra. Tono del cliente: neutral. Resultado: fallido. Tema: Consulta de precio.",
        "transcript": "Cliente: Hola, ¿cuánto cuesta el plan empresarial?\nAgente: El plan empresarial tiene un costo de $120/mes e incluye 50GB, llamadas ilimitadas y soporte prioritario\nCliente: Es un poco caro para mí\nAgente: Entiendo. Tenemos un plan intermedio de $80/mes con 30GB\nCliente: Déjame pensarlo y te aviso\nAgente: Claro, cuando quieras estamos para ayudarte",
        "channel": "whatsapp",
        "message_type": "inbound"
    },
    {
        "agent_name": "Pedro Gómez",
        "campaign": "Servicio",
        "call_type": "support",
        "summary": "Cliente reporta falla técnica. Tono del cliente: negativo. Resultado: exitoso. Tema: Soporte técnico.",
        "transcript": "Cliente: Mi internet no funciona desde ayer\nAgente: Lamento el inconveniente. ¿Ya reiniciaste el módem?\nCliente: Sí, varias veces y nada\nAgente: Veo que hay un corte en tu zona. Ya están trabajando en ello\nCliente: ¿Cuánto tiempo más?\nAgente: Aproximadamente 2 horas. Te compensaremos con 3 días gratis\nCliente: Bueno, ojalá lo arreglen pronto\nAgente: Seguro que sí. Te aviso cuando esté resuelto",
        "channel": "whatsapp",
        "message_type": "inbound"
    },
    {
        "agent_name": "Laura Vargas",
        "campaign": "Retención",
        "call_type": "retention",
        "summary": "Cliente quiere cancelar servicio. Tono del cliente: negativo. Resultado: fallido. Tema: Cancelación.",
        "transcript": "Cliente: Quiero cancelar mi servicio\nAgente: ¿Puedo preguntarte el motivo?\nCliente: Me voy a cambiar a la competencia, tienen mejor precio\nAgente: Entiendo. Podría ofrecerte un 20% de descuento por 6 meses\nCliente: No me interesa, ya tomé la decisión\nAgente: Lo lamento. ¿Hay algo más que pueda hacer?\nCliente: No, procede con la cancelación\nAgente: Entendido, procesaré tu solicitud",
        "channel": "whatsapp",
        "message_type": "inbound"
    },
    {
        "agent_name": "Roberto Díaz",
        "campaign": "Ventas",
        "call_type": "sale",
        "summary": "Cliente compra plan familiar. Tono del cliente: positivo. Resultado: exitoso. Tema: Venta plan familiar.",
        "transcript": "Agente: Hola! Veo que consultaste por el plan familiar\nCliente: Sí, necesito para 4 líneas\nAgente: Perfecto, el plan familiar 4 líneas cuesta $150/mes con 100GB compartidos\nCliente: Me parece bien, ¿cuándo puedo activarlo?\nAgente: Hoy mismo si quieres. ¿Tienes los números de las otras líneas?\nCliente: Sí, te los paso\nAgente: Genial, en 30 minutos está activo. Te envío el contrato\nCliente: Perfecto, gracias!",
        "channel": "whatsapp",
        "message_type": "outbound"
    },
    {
        "agent_name": "Ana López",
        "campaign": "Servicio",
        "call_type": "support",
        "summary": "Cliente no contactado. Resultado: no_contacto.",
        "transcript": "Agente: Hola, ¿cómo estás? Te contacto para dar seguimiento a tu reporte\n[Sin respuesta del cliente]",
        "channel": "whatsapp",
        "message_type": "outbound"
    },
    {
        "agent_name": "Carlos Ruiz",
        "campaign": "Cobranzas",
        "call_type": "collection",
        "summary": "Cliente rechaza pago. Tono del cliente: negativo. Resultado: fallido. Tema: Rechazo de pago.",
        "transcript": "Agente: Hola Sandra, te recordamos tu factura pendiente de $95\nCliente: No tengo dinero ahora\nAgente: ¿Podrías hacer un abono parcial?\nCliente: No, no puedo pagar nada\nAgente: Entiendo, ¿cuándo crees poder hacerlo?\nCliente: No sé, tal vez el otro mes\nAgente: Te voy a dar una semana más. Si no, se suspende el servicio\nCliente: Hagan lo que quieran",
        "channel": "whatsapp",
        "message_type": "outbound"
    },
    {
        "agent_name": "María Fernández",
        "campaign": "Ventas",
        "call_type": "sale",
        "summary": "Cliente compra smartphone con plan. Tono del cliente: positivo. Resultado: exitoso. Tema: Venta smartphone.",
        "transcript": "Cliente: Hola, vi la promo del iPhone con plan\nAgente: Sí! iPhone 15 con plan de $90/mes por 24 meses\nCliente: ¿Incluye el teléfono?\nAgente: Exacto, el teléfono + plan con 40GB\nCliente: Me lo llevo. ¿Cómo hago?\nAgente: Te envío el link para firmar digitalmente\nCliente: Perfecto\nAgente: Listo, en 48hrs te llega a tu casa",
        "channel": "whatsapp",
        "message_type": "inbound"
    },
    {
        "agent_name": "Pedro Gómez",
        "campaign": "Servicio",
        "call_type": "support",
        "summary": "Cliente consulta sobre roaming. Tono del cliente: neutral. Resultado: exitoso. Tema: Roaming internacional.",
        "transcript": "Cliente: Viajo a USA la próxima semana, ¿cómo activo roaming?\nAgente: Para USA tenemos el paquete de roaming de $25 por 7 días con 5GB\nCliente: ¿Incluye llamadas?\nAgente: Sí, llamadas y SMS ilimitados dentro de USA\nCliente: Perfecto, actívalo\nAgente: Listo, queda activo desde que llegues. Buen viaje!",
        "channel": "whatsapp",
        "message_type": "inbound"
    }
]

# Generate dates for last 7 days
base_date = datetime.now() - timedelta(days=7)

print("🌱 Seeding P4 WhatsApp transcriptions...")
print()

inserted = 0
for i, conv in enumerate(whatsapp_conversations):
    # Generate date (spread across last 7 days)
    call_date = (base_date + timedelta(days=i % 7, hours=random.randint(9, 17), minutes=random.randint(0, 59))).isoformat()
    
    payload = {
        "client_id": "wekall",  # Default client
        "agent_name": conv["agent_name"],
        "agent_id": f"agent_{conv['agent_name'].lower().replace(' ', '_')}",
        "campaign": conv["campaign"],
        "call_type": conv["call_type"],
        "call_date": call_date,
        "summary": conv["summary"],
        "transcript": conv["transcript"],
        "channel": conv["channel"],
        "message_type": conv["message_type"],
        "filename": f"whatsapp_{i+1}_{call_date[:10]}.txt",
        "client_phone": f"+57310{random.randint(1000000, 9999999)}"
    }
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/transcriptions",
            headers=headers,
            json=payload
        )
        
        if response.status_code in [200, 201]:
            inserted += 1
            print(f"✅ {inserted}. {conv['agent_name']} - {conv['campaign']} - {conv['summary'][:50]}...")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

print()
print(f"✅ Inserted {inserted}/{len(whatsapp_conversations)} WhatsApp conversations")
print()
print("🔍 Verify with:")
print(f"   SELECT channel, COUNT(*) FROM transcriptions WHERE channel='whatsapp' GROUP BY channel;")
