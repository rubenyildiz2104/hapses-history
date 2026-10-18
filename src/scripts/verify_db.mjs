import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://octtjcjpsporndodwjmb.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdHRqY2pwc3Bvcm5kb2R3am1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjMxOTAyMywiZXhwIjoyMTA3ODk1MDIzfQ.XSimS5EuSzkoUG9Red_UNUyShPAll8_lna8RMeuTbWI';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const TABLES = [
  'profiles',
  'persons',
  'relationships',
  'sources',
  'person_sources',
  'proposals',
  'historical_articles',
  'historical_article_links',
  'historical_article_sources',
  'audit_logs'
];

async function checkDatabase() {
  console.log('--- VÉRIFICATION DE LA BASE DE DONNÉES SUPABASE ---');
  console.log('Projet URL:', SUPABASE_URL);

  const results = {};
  let allOk = true;

  for (const table of TABLES) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results[table] = { status: 'ERREUR / NON CRÉÉE', code: error.code, message: error.message };
        allOk = false;
      } else {
        results[table] = { status: 'OK', count: count ?? 0 };
      }
    } catch (err) {
      results[table] = { status: 'EXCEPTION', message: err.message };
      allOk = false;
    }
  }

  console.log('\nRésultat par table:');
  console.table(results);

  // Check RPC functions
  console.log('\nVérification des fonctions RPC indispensables:');
  try {
    const { data: rpcSearch, error: rpcSearchError } = await supabase.rpc('search_public_persons', {
      p_limit: 1
    });
    console.log('RPC search_public_persons:', rpcSearchError ? `ERREUR (${rpcSearchError.message})` : 'OK');
  } catch (e) {
    console.log('RPC search_public_persons: EXCEPTION', e.message);
  }

  try {
    const { data: rpcDup, error: rpcDupError } = await supabase.rpc('find_potential_duplicates', {
      p_first_names: 'Test',
      p_last_name: 'Test'
    });
    console.log('RPC find_potential_duplicates:', rpcDupError ? `ERREUR (${rpcDupError.message})` : 'OK');
  } catch (e) {
    console.log('RPC find_potential_duplicates: EXCEPTION', e.message);
  }

  // Check demo data count if tables exist
  if (results['persons']?.status === 'OK') {
    const { data: demoPersons } = await supabase.from('persons').select('id, first_names, last_name, life_status, visibility');
    console.log('\nPersonnes actuellement enregistrées:', demoPersons?.length || 0);
    if (demoPersons && demoPersons.length > 0) {
      console.log('Aperçu:');
      demoPersons.forEach(p => console.log(` - ${p.first_names} ${p.last_name} [${p.life_status}, ${p.visibility}]`));
    }
  }

  if (allOk) {
    console.log('\n===> TOUTES LES 10 TABLES SONT PRÉSENTES ET FONCTIONNELLES ! <===');
  } else {
    console.log('\n===> ATTENTION : Les tables ne semblent pas encore avoir été créées sur ce projet Supabase. <===');
  }
}

checkDatabase();
