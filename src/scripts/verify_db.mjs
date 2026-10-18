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
  console.log('--- VÉRIFICATION EN DIRECT DE LA BASE SUPABASE ---');
  console.log('URL du projet:', SUPABASE_URL);

  const results = {};
  let tablesMissing = 0;

  for (const table of TABLES) {
    try {
      const { data, error, status } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error || status === 404) {
        results[table] = { existe: 'NON (Table absente)', message: error?.message || '404 Not Found' };
        tablesMissing++;
      } else {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        results[table] = { existe: 'OUI (Table créée)', lignes: count ?? data?.length ?? 0 };
      }
    } catch (err) {
      results[table] = { existe: 'ERREUR', message: err.message };
      tablesMissing++;
    }
  }

  console.log('\nÉtat des 10 tables:');
  console.table(results);

  if (tablesMissing === 0) {
    console.log('\n===> TOUTES LES 10 TABLES SONT BIEN CRÉÉES DANS SUPABASE ! <===');
  } else {
    console.log(`\n===> ATTENTION : ${tablesMissing} / ${TABLES.length} tables ne sont pas encore créées dans Supabase. <===`);
    console.log('Pour les créer, exécutez le script supabase/full_setup.sql dans le SQL Editor de Supabase.');
  }
}

checkDatabase();
