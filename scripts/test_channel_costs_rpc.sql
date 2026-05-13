-- Test: get_channel_cost_comparison() — verificar si falla por voicebot_used
-- 13 mayo 2026

-- Test 1: Crediminuto (debe tener datos seed)
SELECT public.get_channel_cost_comparison('crediminuto');

-- Test 2: WeKall (debe tener datos seed)
SELECT public.get_channel_cost_comparison('wekall');

-- Test 3: Cliente inexistente (debe retornar vacío)
SELECT public.get_channel_cost_comparison('cliente_inexistente');

-- Verificar datos seed en channel_costs
SELECT client_id, channel, costo_por_interaccion, vigente_desde
FROM public.channel_costs
ORDER BY client_id, channel;
