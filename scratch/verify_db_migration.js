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

async function verifyRefactorTables() {
  console.log('--- Database Verification ---');
  const tables = ['ideas', 'idea_issues', 'idea_patches'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.error(`[${table}] ❌ FAILED: Table does not exist in database.`);
      } else {
        console.error(`[${table}] ❌ ERROR:`, error.message);
      }
    } else {
      console.log(`[${table}] ✅ VERIFIED: Table exists and is accessible.`);
      if (data && data.length > 0) {
        console.log(`    Columns: ${Object.keys(data[0]).join(', ')}`);
      } else {
        console.log(`    Table is currently empty (New migrations always start empty).`);
      }
    }
  }
}

verifyRefactorTables();
