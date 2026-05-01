import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iszodrpublcnsyvtgjcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzem9kcnB1YmxjbnN5dnRnamNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNTY2MzQsImV4cCI6MjA2MDczMjYzNH0.wFQxao_N_1aE0vkYEKqJTQ7sGrh0bPcNa_7tLOzQTkg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateBold() {
  console.log('🔍 Buscando cliente BOLD...\n');

  // 1. Buscar cliente BOLD
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .or('client_name.ilike.%bold%,client_id.ilike.%bold%');

  if (clientsError) {
    console.error('❌ Error buscando cliente:', clientsError);
    return;
  }

  console.log('📊 Clientes encontrados:', clients?.length || 0);
  if (clients && clients.length > 0) {
    clients.forEach(c => {
      console.log(`  - ${c.client_id} (${c.client_name}) — ${c.business_type || 'N/A'}`);
    });
  }

  // 2. Buscar contact centers de BOLD
  if (clients && clients.length > 0) {
    console.log('\n🏢 Contact Centers para BOLD:');
    for (const client of clients) {
      const { data: ccs, error: ccsError } = await supabase
        .from('contact_centers')
        .select('*')
        .eq('client_id', client.client_id)
        .order('created_at');

      if (ccsError) {
        console.error(`  ❌ Error para ${client.client_id}:`, ccsError);
        continue;
      }

      console.log(`\n  Cliente: ${client.client_name} (${client.client_id})`);
      console.log(`  Total CC: ${ccs?.length || 0}`);
      if (ccs && ccs.length > 0) {
        ccs.forEach((cc, idx) => {
          console.log(`    ${idx + 1}. ${cc.contact_center_id} — ${cc.contact_center_name || 'Sin nombre'}`);
          console.log(`       Timezone: ${cc.timezone || 'N/A'} | Creado: ${cc.created_at}`);
        });
      }
    }
  }

  // 3. Clientes con múltiples contact centers
  console.log('\n\n📍 Clientes multi-instancia (>1 CC):');
  const { data: allClients } = await supabase
    .from('clients')
    .select('client_id, client_name');

  if (allClients) {
    const multiInstance = [];
    for (const client of allClients) {
      const { data: ccs } = await supabase
        .from('contact_centers')
        .select('contact_center_id')
        .eq('client_id', client.client_id);

      if (ccs && ccs.length > 1) {
        multiInstance.push({ ...client, count: ccs.length });
      }
    }

    if (multiInstance.length > 0) {
      multiInstance.sort((a, b) => b.count - a.count);
      multiInstance.forEach(c => {
        console.log(`  - ${c.client_name} (${c.client_id}): ${c.count} contact centers`);
      });
    } else {
      console.log('  (Ningún cliente con múltiples instancias encontrado)');
    }
  }
}

validateBold().catch(console.error);
