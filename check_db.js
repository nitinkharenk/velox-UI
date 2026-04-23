const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envVars = fs.readFileSync('.env.local', 'utf8').split('\n');
let supabaseUrl = '';
let supabaseKey = '';

envVars.forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

if (supabaseUrl.startsWith('"')) supabaseUrl = supabaseUrl.slice(1, -1);
if (supabaseKey.startsWith('"')) supabaseKey = supabaseKey.slice(1, -1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = ['ideas', 'assets', 'asset_versions', 'pipelines', 'pipeline_stages'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`[${table}] ERROR:`, error.message);
    } else {
      if (data && data.length > 0) {
         console.log(`[${table}] Columns found (${Object.keys(data[0]).length}):`, Object.keys(data[0]).join(', '));
      } else {
         console.log(`[${table}] Table is empty, cannot infer columns from a select without rows natively via REST API. Let's try to insert a dummy row or fetch via schema if possible.`);
      }
    }
  }
}

checkTables();
