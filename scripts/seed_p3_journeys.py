#!/usr/bin/env python3
"""
P3 Seed Data: Insert sample customer journeys
Demonstrates multi-channel customer interactions
"""

import requests
import json
from datetime import datetime, timedelta

SUPABASE_URL = "https://iszodrpublcnsyvtgjcg.supabase.co"
SERVICE_KEY = "sb_secret_cTZiXtV1sViVZB-lb1GEEw_-7HPRPqb"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Sample journeys
journeys = [
    {
        "client_id": "wekall",
        "customer_id": "C001",
        "journey_id": "journey_c001_2026051201",
        "inicio": (datetime.now() - timedelta(days=5)).isoformat(),
        "fin": (datetime.now() - timedelta(days=1)).isoformat(),
        "resultado": "exitoso",
        "touchpoints": [
            {
                "id": "tp1",
                "channel": "voz",
                "timestamp": (datetime.now() - timedelta(days=5, hours=2)).isoformat(),
                "agent_name": "Ana López",
                "summary": "Cliente consulta opciones de pago para factura vencida",
                "resultado": "pendiente"
            },
            {
                "id": "tp2",
                "channel": "whatsapp",
                "timestamp": (datetime.now() - timedelta(days=3, hours=14)).isoformat(),
                "agent_name": "Carlos Ruiz",
                "summary": "Cliente solicita link de pago digital",
                "resultado": "pendiente"
            },
            {
                "id": "tp3",
                "channel": "email",
                "timestamp": (datetime.now() - timedelta(days=2, hours=10)).isoformat(),
                "agent_name": "María Fernández",
                "summary": "Envío de confirmación de pago recibido",
                "resultado": "exitoso"
            },
            {
                "id": "tp4",
                "channel": "voz",
                "timestamp": (datetime.now() - timedelta(days=1, hours=15)).isoformat(),
                "agent_name": "Ana López",
                "summary": "Seguimiento post-pago y oferta de plan mejorado",
                "resultado": "exitoso"
            }
        ]
    },
    {
        "client_id": "wekall",
        "customer_id": "C002",
        "journey_id": "journey_c002_2026051202",
        "inicio": (datetime.now() - timedelta(days=4)).isoformat(),
        "fin": (datetime.now() - timedelta(days=2)).isoformat(),
        "resultado": "fallido",
        "touchpoints": [
            {
                "id": "tp1",
                "channel": "whatsapp",
                "timestamp": (datetime.now() - timedelta(days=4, hours=9)).isoformat(),
                "agent_name": "Pedro Gómez",
                "summary": "Cliente reporta falla en el servicio",
                "resultado": "pendiente"
            },
            {
                "id": "tp2",
                "channel": "voz",
                "timestamp": (datetime.now() - timedelta(days=3, hours=11)).isoformat(),
                "agent_name": "Laura Vargas",
                "summary": "Cliente expresa insatisfacción, solicita cancelación",
                "resultado": "fallido"
            }
        ]
    },
    {
        "client_id": "wekall",
        "customer_id": "C003",
        "journey_id": "journey_c003_2026051203",
        "inicio": (datetime.now() - timedelta(days=6)).isoformat(),
        "fin": (datetime.now()).isoformat(),
        "resultado": "exitoso",
        "touchpoints": [
            {
                "id": "tp1",
                "channel": "chat",
                "timestamp": (datetime.now() - timedelta(days=6, hours=16)).isoformat(),
                "agent_name": "Roberto Díaz",
                "summary": "Cliente consulta sobre plan familiar",
                "resultado": "pendiente"
            },
            {
                "id": "tp2",
                "channel": "email",
                "timestamp": (datetime.now() - timedelta(days=5, hours=10)).isoformat(),
                "agent_name": "Ana López",
                "summary": "Envío de cotización detallada plan familiar 4 líneas",
                "resultado": "pendiente"
            },
            {
                "id": "tp3",
                "channel": "whatsapp",
                "timestamp": (datetime.now() - timedelta(days=3, hours=14)).isoformat(),
                "agent_name": "Carlos Ruiz",
                "summary": "Cliente solicita aclaración sobre beneficios",
                "resultado": "pendiente"
            },
            {
                "id": "tp4",
                "channel": "voz",
                "timestamp": (datetime.now() - timedelta(days=1, hours=11)).isoformat(),
                "agent_name": "María Fernández",
                "summary": "Cierre de venta plan familiar - cliente acepta propuesta",
                "resultado": "exitoso"
            },
            {
                "id": "tp5",
                "channel": "email",
                "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
                "agent_name": "María Fernández",
                "summary": "Envío de contrato digital y confirmación de activación",
                "resultado": "exitoso"
            }
        ]
    },
    {
        "client_id": "wekall",
        "customer_id": "C004",
        "journey_id": "journey_c004_2026051204",
        "inicio": (datetime.now() - timedelta(days=2)).isoformat(),
        "fin": (datetime.now() - timedelta(hours=3)).isoformat(),
        "resultado": "pendiente",
        "touchpoints": [
            {
                "id": "tp1",
                "channel": "voz",
                "timestamp": (datetime.now() - timedelta(days=2, hours=10)).isoformat(),
                "agent_name": "Pedro Gómez",
                "summary": "Cliente consulta sobre roaming internacional",
                "resultado": "pendiente"
            },
            {
                "id": "tp2",
                "channel": "whatsapp",
                "timestamp": (datetime.now() - timedelta(hours=3)).isoformat(),
                "agent_name": "Laura Vargas",
                "summary": "Envío de información de paquetes roaming disponibles",
                "resultado": "pendiente"
            }
        ]
    },
    {
        "client_id": "wekall",
        "customer_id": "C005",
        "journey_id": "journey_c005_2026051205",
        "inicio": (datetime.now() - timedelta(days=7)).isoformat(),
        "fin": (datetime.now() - timedelta(days=1)).isoformat(),
        "resultado": "exitoso",
        "touchpoints": [
            {
                "id": "tp1",
                "channel": "email",
                "timestamp": (datetime.now() - timedelta(days=7, hours=8)).isoformat(),
                "agent_name": "Roberto Díaz",
                "summary": "Campaña de retención - cliente con 6 meses sin pagos",
                "resultado": "pendiente"
            },
            {
                "id": "tp2",
                "channel": "voz",
                "timestamp": (datetime.now() - timedelta(days=5, hours=15)).isoformat(),
                "agent_name": "Ana López",
                "summary": "Negociación de plan de pagos - cliente acepta 3 cuotas",
                "resultado": "exitoso"
            },
            {
                "id": "tp3",
                "channel": "whatsapp",
                "timestamp": (datetime.now() - timedelta(days=3, hours=12)).isoformat(),
                "agent_name": "Carlos Ruiz",
                "summary": "Recordatorio primera cuota - cliente confirma pago",
                "resultado": "exitoso"
            },
            {
                "id": "tp4",
                "channel": "voz",
                "timestamp": (datetime.now() - timedelta(days=1, hours=10)).isoformat(),
                "agent_name": "Ana López",
                "summary": "Confirmación de pago recibido y reactivación de servicio",
                "resultado": "exitoso"
            }
        ]
    }
]

print("🌱 Seeding P3 Customer Journeys...")
print()

inserted = 0
for journey in journeys:
    try:
        # Convert touchpoints to JSON string
        payload = {
            **journey,
            "touchpoints": json.dumps(journey["touchpoints"])
        }
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/customer_journeys",
            headers=headers,
            json=payload
        )
        
        if response.status_code in [200, 201]:
            inserted += 1
            print(f"✅ {inserted}. {journey['customer_id']} - {len(journey['touchpoints'])} touchpoints - {journey['resultado']}")
        else:
            print(f"❌ Error for {journey['customer_id']}: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Exception for {journey['customer_id']}: {e}")

print()
print(f"✅ Inserted {inserted}/{len(journeys)} customer journeys")
print()
print("🔍 Test in UI:")
print("   1. Go to /customer-journey")
print("   2. Search for: C001, C002, C003, C004, or C005")
print("   3. View the timeline!")
